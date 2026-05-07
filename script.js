(function () {
  var video = document.getElementById("scrubVideo");
  var shell = document.querySelector(".video-shell");
  var progressBar = document.getElementById("progressBar");
  var notice = document.getElementById("videoNotice");
  var debugEnabled = new URLSearchParams(window.location.search).has("debugVideo");
  var debugPanel = null;
  var duration = 0;
  var ticking = false;
  var lastEvent = "init";
  var syncUntil = 0;

  if (debugEnabled) {
    debugPanel = document.createElement("pre");
    debugPanel.className = "video-debug is-visible";
    debugPanel.setAttribute("aria-live", "polite");
    document.body.appendChild(debugPanel);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getScrollProgress() {
    var scrollable =
      document.documentElement.scrollHeight - window.innerHeight;

    if (scrollable <= 0) {
      return 0;
    }

    return clamp(window.scrollY / scrollable, 0, 1);
  }

  function updateProgress(progress) {
    progressBar.style.width = progress * 100 + "%";
  }

  function getDebugState() {
    return {
      lastEvent: lastEvent,
      readyState: video.readyState,
      networkState: video.networkState,
      duration: video.duration,
      trackedDuration: duration,
      currentTime: video.currentTime,
      currentSrc: video.currentSrc,
      error: video.error ? video.error.code : null,
      videoClass: video.className,
      shellClass: shell ? shell.className : null,
    };
  }

  function updateDebug(eventName) {
    if (eventName) {
      lastEvent = eventName;
    }

    window.__montfortVideoDebug = getDebugState();

    if (debugPanel) {
      debugPanel.textContent = JSON.stringify(window.__montfortVideoDebug, null, 2);
    }
  }

  function markVideoReady(eventName) {
    updateDebug(eventName || "ready-check");

    if (Number.isFinite(video.duration) && video.duration > 0) {
      duration = video.duration;
    }

    if (!duration) {
      return;
    }

    video.pause();
    video.classList.add("is-ready");
    if (shell) {
      shell.classList.add("is-ready");
    }
    notice.classList.add("is-hidden");
    updateDebug("ready");
    requestScrub();
  }

  function scrubVideo() {
    ticking = false;

    var progress = getScrollProgress();
    updateProgress(progress);

    if (!duration || !Number.isFinite(duration)) {
      return;
    }

    // Scroll progress is mapped directly to the video's timeline.
    // Top of the page is 0s; bottom of the page is the full duration.
    var targetTime = progress * duration;

    if (Math.abs(video.currentTime - targetTime) > 0.035) {
      video.currentTime = targetTime;
    }

    keepScrubSynced();
  }

  function requestScrub() {
    syncUntil = performance.now() + 250;

    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(scrubVideo);
  }

  function requestFinalScrub() {
    syncUntil = performance.now() + 700;
    requestScrub();
  }

  function keepScrubSynced() {
    if (performance.now() <= syncUntil) {
      requestScrub();
    }
  }

  ["loadstart", "loadedmetadata", "durationchange", "loadeddata", "canplay"].forEach(
    function (eventName) {
      video.addEventListener(eventName, function () {
        markVideoReady(eventName);
      });
    },
  );

  ["progress", "suspend", "stalled", "waiting", "emptied"].forEach(function (eventName) {
    video.addEventListener(eventName, function () {
      updateDebug(eventName);
    });
  });

  video.addEventListener("error", function () {
    duration = 0;
    var error = video.error;
    var detail = error ? " Browser media error code: " + error.code + "." : "";
    notice.textContent =
      "Video could not be loaded from montfort-scroll-demo.mp4." + detail;
    notice.classList.remove("is-hidden");
    updateDebug("error");
  });

  window.addEventListener("scroll", requestScrub, { passive: true });
  window.addEventListener("scrollend", requestFinalScrub);
  window.addEventListener("resize", requestScrub);

  video.load();

  if (video.readyState >= 1) {
    markVideoReady("initial-readyState");
  }

  window.setTimeout(function () {
    if (video.readyState >= 1 || Number.isFinite(video.duration)) {
      markVideoReady("delayed-readyState");
    } else {
      updateDebug("delayed-not-ready");
    }
  }, 500);

  updateDebug("started");
  requestScrub();
})();
