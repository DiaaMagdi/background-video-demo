(function () {
  var video = document.getElementById("scrubVideo");
  var source = video.querySelector("source");
  var shell = document.querySelector(".video-shell");
  var progressBar = document.getElementById("progressBar");
  var notice = document.getElementById("videoNotice");
  var assetSrc = source ? source.getAttribute("src") : "";
  var debugEnabled = new URLSearchParams(window.location.search).has("debugVideo");
  var debugPanel = null;
  var objectUrl = null;
  var sourceMode = "native";
  var duration = 0;
  var targetTime = 0;
  var ticking = false;
  var lastEvent = "init";
  var syncUntil = 0;
  var settleThreshold = 0.025;
  var snapThreshold = 0.08;
  var scrubEase = 0.22;

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
      targetTime: targetTime,
      currentSrc: video.currentSrc,
      assetSrc: assetSrc,
      sourceMode: sourceMode,
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
    targetTime = progress * duration;

    var timeDelta = targetTime - video.currentTime;
    var absDelta = Math.abs(timeDelta);

    if (video.seeking) {
      queueScrubFrame();
      return;
    }

    if (absDelta > settleThreshold) {
      var nextTime =
        absDelta <= snapThreshold
          ? targetTime
          : video.currentTime + timeDelta * scrubEase;

      video.currentTime = clamp(nextTime, 0, duration);
    }

    if (Math.abs(targetTime - video.currentTime) > settleThreshold) {
      queueScrubFrame();
      return;
    }

    if (performance.now() > syncUntil && Math.abs(video.currentTime - targetTime) > 0) {
      video.currentTime = targetTime;
    }

    keepScrubSynced();
  }

  function queueScrubFrame() {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(scrubVideo);
  }

  function requestScrub() {
    syncUntil = performance.now() + 250;
    queueScrubFrame();
  }

  function requestFinalScrub() {
    syncUntil = performance.now() + 700;
    queueScrubFrame();
  }

  function keepScrubSynced() {
    if (performance.now() <= syncUntil) {
      queueScrubFrame();
    }
  }

  function loadNativeVideo() {
    sourceMode = "native";
    video.load();
    updateDebug("native-source");
  }

  function loadVideoAsset() {
    if (!assetSrc || !window.fetch || !window.URL || !window.Blob) {
      loadNativeVideo();
      return;
    }

    sourceMode = "loading-blob";
    updateDebug("loading-blob");

    fetch(assetSrc)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Video request failed with status " + response.status);
        }

        return response.blob();
      })
      .then(function (blob) {
        if (objectUrl) {
          window.URL.revokeObjectURL(objectUrl);
        }

        objectUrl = window.URL.createObjectURL(blob);
        sourceMode = "blob";
        video.src = objectUrl;
        video.load();
        updateDebug("blob-source");
      })
      .catch(function () {
        loadNativeVideo();
      });
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

  loadVideoAsset();

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
