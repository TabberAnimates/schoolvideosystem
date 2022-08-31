//An HTML5 specific wrapper for videos.
API.Html5Video = function (tag) {
    var _this = this;
    _this.videoElem = tag;
    _this.tagId = tag.id;
    _this.callbacks = [];

    this.addCallbackListener = function (eventName, callbackFunction) {
        _this.callbacks[eventName] = _this.callbacks[eventName] || new Array();
        _this.callbacks[eventName].push(callbackFunction);
    }

    this.throwEvent = function (eventName) {
        var params = Array.prototype.slice.call(arguments).slice(1);

        if (_this.callbacks[eventName])
            for (var i = 0; i < _this.callbacks[eventName].length; i++) {
                _this.callbacks[eventName][i].apply(this, params);
            }
    };

    _this.videoElem.addEventListener("seeking", function () {
        _this.throwEvent("seeking");
    });
    _this.videoElem.addEventListener("loadeddata", function () {
        _this.throwEvent("FileLoaded");
    });

    _this.videoElem.addEventListener("timeupdate", function () {
        //_this.throwEvent(_this.currentTime);
        _this.videoTimeChanged(this.currentTime, this.duration);
    });

    _this.videoElem.addEventListener("canplay", function () {
        //$(this).get(0).play(); //We now use the autoplay attribute.
        $("#please-wait:visible").remove();
    }, false);

    _this.videoElem.addEventListener("ended", function () {
        _this.throwEvent("Paused");
        _this.videoComplete();
    });

    _this.videoElem.addEventListener("error", function (e) {
        var error = _this.videoElem.error;
        if (error && error.code) {
            _this.throwEvent("FileNotFound");
        }
    });

    _this.videoElem.addEventListener("abort", function () {
        //_this.throwEvent(_this.currentTime);
        //console.log("===ABORT, NETWORK STATE: " + _this.videoElem.networkState);
        if (_this.videoElem.networkState == 3) {
            $(_this.videoElem).trigger("error", function () { });
        }
    }, true);

    _this.videoElem.addEventListener("loadstart", function () {
        //_this.throwEvent("FileNotFound");
    });

    _this.videoElem.addEventListener("progress", function () {
        //_this.throwEvent("FileNotFound");
    });

    _this.videoElem.addEventListener("suspend", function () {
        //_this.throwEvent("FileNotFound");
    });

    _this.videoElem.addEventListener("emptied", function () {
        //_this.throwEvent("FileNotFound");
    });

    _this.videoElem.addEventListener("stalled", function () {
        //_this.throwEvent("FileNotFound");
    });

    _this.videoElem.addEventListener("playing", function () {
        _this.throwEvent("Playing");
    });

    _this.videoElem.addEventListener("pause", function () {
        _this.throwEvent("Paused");
    });

    _this.videoElem.addEventListener('loadedmetadata', function () {
        _this.updateBuffer();
    });


    _this.updateBuffer = function () {
        var buffered = _this.buffered();
        if (buffered < 1) setTimeout(_this.updateBuffer, 200);
        if (_this.videoBuffering) _this.videoBuffering(buffered, tag.duration);
    }

    var _buffered = 0;
    _this.buffered = function () {
        if (!tag || !tag.parentNode) return 0; //Video player no longer exists.
        try {
            _buffered = parseFloat(tag.buffered.end(0) / tag.duration);
        } catch (ex) { } //Ensure buffer updating continues even if an exception occurs.
        return _buffered;
    }

    _this.currentPosition = 0;

    _this.play = function () {
        if (tag.currentTime / tag.duration > 0.99) {
            _this.seek(0);
        }
        _this.videoElem.play();
    };
    _this.pause = function () {
        _this.videoElem.pause();
    };

    _this.seek = function (seconds, failures) {
        if (typeof (failures) == "undefined") failures = 0;

        var objectExists = (_this.videoElem.readyState == 4);

        if (objectExists) {
            _this.videoElem.currentTime = seconds;
            return seconds;
        } else if (++failures < 50) {
            setTimeout(function () { _this.seek(seconds, failures); }, 100);
            return;
        } else {
            console.log("Failed to retrieve HTML 5 Video object");
            failures = 0;
            return;
        }
    };

    _this.getSource = function () {
        return _this.videoElem.src;
    }

    _this.getVolume = function (val) {
        return _this.videoElem.volume;
    };
    _this.setVolume = function (val) {
        _this.videoElem.volume = val;
        return val;
    };

    _this.getCurrentPosition = function () {
        return _this.currentTime;
    };
    _this.setCurrentPosition = function (val) {
        _this.currentTime = val;
    };
}

//A wrapper that relates a nested specific video player type with a caption object.
API.VideoWrapper = function (elem, caption) {
    var _this = this;

    var tag;
    _this.theVideo = null;
    if (elem && (typeof (elem) == "string" || elem instanceof String)) { // video ID
        tag = document.getElementById(elem);
    } else if (elem && elem.length) { // jQuery collection
        tag = elem[0];
    } else if (elem && elem.tagName) { // video or object element
        tag = elem;
    }

    if (!tag || !tag.tagName) {
        throw "Invalid video";
    }

    _this.caption = caption;

    if (tag.tagName.toLowerCase() == "video") {
        _this.theVideo = new API.Html5Video(tag);
    }

    _this.playHeadUpdateHandlers = [];
    _this.completeHandlers = [];
    _this.bufferingHandlers = [];
    _this.errorHandlers = [];
    _this.volumeUpdateHandlers = [];
    _this.playingHandlers = [];
    _this.pausedHandlers = [];
    _this.fileNotFoundHandlers = [];
    _this.fileLoadedHandlers = [];
    _this.seekingHandlers = [];

    _this.play = _this.theVideo.play;
    _this.pause = _this.theVideo.pause;
    _this.stop = function () {
        _this.pause();
        _this.seek(0);
        _this.pause();
    };
    _this.seek = function (seconds) {
        //_this.videoTimeChanged(seconds);
        _this.theVideo.seek(seconds);
    };
    _this.forward = function () {
        _this.seek(_this.theVideo.currentPosition + 3);
    };
    _this.backward = function () {
        _this.seek(_this.theVideo.currentPosition - 3);
    };
    _this.volumeUp = function () {
        _this.setVolume(_this.getVolume() + .1);
        volumeChanged();
    };
    _this.volumeDown = function () {
        _this.setVolume(_this.getVolume() - .1);
        volumeChanged();
    }

    _this.getVolume = _this.theVideo.getVolume;
    _this.setVolume = function (val) {
        if (val < 0) {
            val = 0;
        } else if (val > 1) {
            val = 1;
        }
        _this.theVideo.setVolume(val);
        volumeChanged();
    };

    _this.getSource = _this.theVideo.getSource;

    _this.getCurrentPosition = _this.theVideo.getCurrentPosition;
    _this.setCurrentPosition = _this.theVideo.setCurrentPosition;

    function volumeChanged() {
        for (var i = 0; i < _this.volumeUpdateHandlers.length; ++i) {
            _this.volumeUpdateHandlers[i]();
        }
    }
    volumeChanged();

    _this.addEventListener = function (eventName, callbackFunction) {
        switch (eventName) {
            case "onPlayheadUpdate":
            case "PlayheadUpdate":
                if (callbackFunction) {
                    _this.playHeadUpdateHandlers.push(callbackFunction);
                }
                break;
            case "onComplete":
            case "Complete":
                if (callbackFunction) {
                    _this.completeHandlers.push(callbackFunction);
                }
                break;
            case "onBuffering":
            case "Buffering":
                if (callbackFunction) {
                    _this.bufferingHandlers.push(callbackFunction);
                }
                break;
            case "onError":
            case "Error":
                if (callbackFunction) {
                    _this.errorHandlers.push(callbackFunction);
                }
                break;
            case "onVolumeUpdate":
            case "VolumeUpdate":
                if (callbackFunction) {
                    _this.volumeUpdateHandlers.push(callbackFunction);
                }
                break;
            case "Playing":
                if (callbackFunction) {
                    _this.playingHandlers.push(callbackFunction);
                }
                break;
            case "Paused":
                if (callbackFunction) {
                    _this.pausedHandlers.push(callbackFunction);
                }
                break;
            case "FileNotFound":
                if (callbackFunction) {
                    _this.fileNotFoundHandlers.push(callbackFunction);
                }
                break;
            case "FileLoaded":
                if (callbackFunction) {
                    _this.fileLoadedHandlers.push(callbackFunction);
                }
                break;
            case "seeking":
                if (callbackFunction) {
                    _this.seekingHandlers.push(callbackFunction);
                }
                break;
        }
    };

    this.videoTimeChanged = function (seconds, duration) {
        _this.setCurrentPosition(seconds);
        _this.caption.writeCaption(seconds);
        for (var j = 0; j < _this.playHeadUpdateHandlers.length; ++j) {
            _this.playHeadUpdateHandlers[j](seconds, duration);
        }
    }

    _this.theVideo.addCallbackListener("PlayheadUpdate", this.videoTimeChanged);
    _this.theVideo.videoTimeChanged = this.videoTimeChanged;

    this.videoComplete = function () {
        for (var j = 0; j < _this.completeHandlers.length; ++j) {
            _this.completeHandlers[j]();
        }
    }

    _this.theVideo.addCallbackListener("Complete", this.videoComplete);
    _this.theVideo.videoComplete = this.videoComplete;

    this.videoBuffering = function (percent, duration) {
        for (var j = 0; j < _this.bufferingHandlers.length; ++j) {
            _this.bufferingHandlers[j](percent, duration);
        }
    }

    _this.theVideo.addCallbackListener("Buffering", this.videoBuffering);
    _this.theVideo.videoBuffering = this.videoBuffering;

    this.videoPlaying = function () {
        for (var j = 0; j < _this.playingHandlers.length; ++j) {
            _this.playingHandlers[j]();
        }
    }

    _this.theVideo.addCallbackListener("Playing", this.videoPlaying);

    this.videoPaused = function () {
        for (var j = 0; j < _this.pausedHandlers.length; ++j) {
            _this.pausedHandlers[j]();
        }
    }

    _this.theVideo.addCallbackListener("Paused", this.videoPaused);

    this.fileNotFound = function () {
        for (var j = 0; j < _this.fileNotFoundHandlers.length; ++j) {
            _this.fileNotFoundHandlers[j]();
        }
    }
    _this.theVideo.addCallbackListener("FileNotFound", this.fileNotFound);

    this.fileLoaded = function () {
        for (var j = 0; j < _this.fileLoadedHandlers.length; ++j) {
            _this.fileLoadedHandlers[j]();
        }
    }
    _this.theVideo.addCallbackListener("FileLoaded", this.fileLoaded);

    this.seeking = function () {
        for (var j = 0; j < _this.seekingHandlers.length; ++j) {
            _this.seekingHandlers[j]();
        }
    }

    _this.theVideo.addCallbackListener("seeking", this.seeking);
}

//The same controls are used by both html5 and the flash video player.
API.FrameVideoControls = function (video) {
    var FrameVideoControls = this;

    this.video = video;

    this.scrubBarLeft = 10;
    this.scrubBarRight = 10;
    this.scrubOffset = 17;
    this.selected = false;
    this.audioSelected = false;
    this.progress = 0;

    this.idPrefix = API.Utilities.createUid() + "_";

    this.elementIDs = new function () {
        this.controlsContainer = FrameVideoControls.idPrefix + "controls";
        this.scrubBar = FrameVideoControls.idPrefix + "scrubBar";
        this.buffered = FrameVideoControls.idPrefix + "buffered";
        this.played = FrameVideoControls.idPrefix + "played";
        this.time = FrameVideoControls.idPrefix + "time";
        this.play = FrameVideoControls.idPrefix + "play";
        this.scrubber = FrameVideoControls.idPrefix + "scrubber";
        this.closedCaption = FrameVideoControls.idPrefix + "closedCaption";
        this.audioButton = FrameVideoControls.idPrefix + "audioButton";
        this.volumeButton = FrameVideoControls.idPrefix + "volumeButton";
        this.progressContainer = FrameVideoControls.idPrefix + "progressContainer";
        this.settings = FrameVideoControls.idPrefix + "settings";

        this.audioTrack = FrameVideoControls.idPrefix + "audioTrack";
        this.volumeSlider = "slider-vertical";
        this.vidVolume = "vid_volume";
        this.vidPos = "vid_pos";
        this.sliderMuteButton = "slider-mute";

        this.progressLimit = FrameVideoControls.idPrefix + "progressLimit";
    }

    //Hide the IFrame, before displaying the video.
    $("iframe").each(function () {
        if (this.contentWindow == API.childWindow) $(this).hide();
    });

    //var ccnode = document.createElement("div");
    //ccnode.id = FrameVideoControls.idPrefix + "ccdiv";

    //var newNode = document.createElement("div");
    //newNode.id = FrameVideoControls.idPrefix + "controls";


    this.resetDisplay = function () {
        FrameVideoControls.progress = 0;
        $("#" + FrameVideoControls.elementIDs.progressLimit).css("left", FrameVideoControls.scrubBarLeft + FrameVideoControls.scrubOffset + "px");
        $("#" + FrameVideoControls.elementIDs.scrubber).css("left", FrameVideoControls.scrubBarLeft + "px");
    }

    var newNode = $("#" + API.Video.elementIDs.frameVideoControls);


    newNode.html(
        "<div id=\"" + FrameVideoControls.idPrefix + "chooseServerBG\" class=\"Hidden\"></div>" +
        "<div id=\"" + FrameVideoControls.idPrefix + "chooseServer\" class=\"Hidden\">Choose a server:<br />Magic<br />Local</div>" +
        "<div class=\"vcplayer\">" +
        "<ul class=\"controls\">" +

        "<li id=\"" + FrameVideoControls.idPrefix + "play\" class=\"play\" tabindex=\"0\"><a href='javascript:void(0);'>Play</a></li>" +
        /* "<li class=\"fullscreen\"><a href='javascript:void(0);'>Expand</a></li>" +*/
        "<li id=\"" + FrameVideoControls.idPrefix + "settingsButton\" class=\"SettingsButton\"></li>" +
        "<li id=\"" + FrameVideoControls.idPrefix + "volumeButton\" class=\"volume\" >" +
        "<div id='slider-vertical'><div id='slider-vertical-slider' style='height: 100%;'></div></div>" +
        "<div id='slider-mute'><i class='icon-media-volume2'></i></div>" +
        "<a href=\"javascript:void(0);\" id=\"v_control\">Volume Control</a>" +
        "<div id=\"vid_volume\">80</div>" +
        "</li>" +
        "<li id=\"" + FrameVideoControls.idPrefix + "closedCaption\" class=\"cc\"><a href='javascript:void(0);'>Closed Captioning</a></li>" +
        "<li id=\"" + FrameVideoControls.idPrefix + "time\" class=\"timer\">0:00 / 0:00</li>" +
        "<li id=\"" + FrameVideoControls.idPrefix + "progressContainer\" class=\"Progress\" style=\"width: auto;\">" +
        "<div id=\"" + FrameVideoControls.idPrefix + "scrubBar\" class=\"ScubBar\"></div>" +
        "<div id=\"" + FrameVideoControls.idPrefix + "buffered\" class=\"Buffered\"></div>" +
        "<div id=\"" + FrameVideoControls.idPrefix + "played\" class=\"Played\"></div>" +
        "<div id=\"" + FrameVideoControls.idPrefix + "scrubber\" class=\"Scrubber\"></div>" +
        "<div id=\"" + FrameVideoControls.idPrefix + "progressLimit\" class=\"ProgressLimit\"></div>" +
        "<div id=\"vid_pos\" style='display: none'></div>" +
        "</li>" +
        "</ul>" +
        "</div>"
    );

    $('#vid_volume').change(function () {
        video.muted = false;
        $('#slider-mute i').addClass("icon-media-volume2");
        video.wrapper.setVolume(0.8);
    });

    $('.vcplayer').css("visibility", "hidden");

    $('#slider-vertical-slider').slider({
        orientation: 'vertical',
        range: 'min',
        min: 0,
        max: 100,
        value: 80,
        slide: function (event, ui) {
            $(".ui-slider-range").css("height", "100%");
            var value = $("#slider-vertical-slider").slider("value");
            $('#vid_volume').html(value / 100);
        }
    });

    $("#v_control").click(function (e) {
        if ($('#slider-vertical').is(':visible')) {
            $('#slider-vertical').hide();
            $('#slider-mute').hide();
        } else {
            $('#slider-vertical').show();
            $('#slider-mute').show();
        }
    });
    $('#slider-vertical').hide();
    $('#slider-mute').hide();

    function showSelected(id) {
        $("a.plainbtn").each(function (index) {
            if ($(this).attr('id') == id) {
                $('#' + id).addClass('selected-option');
            } else {
                $('#' + $(this).attr('id')).removeClass('selected-option');
            }
        });
    }

    $("#frameAudioControls").hide();
    newNode.show();

    var settingsNode = document.createElement("div");
    document.getElementById("frameArea").appendChild(settingsNode);
    $(settingsNode).dialog({ resizable: false, draggable: false, width: 600, height: 200, autoOpen: false });

    $("#" + FrameVideoControls.idPrefix + "settingsButton").click(function () { FrameVideoControls.openSettingsDialog(); });

    $(newNode).css("z-index", "2");
    $(newNode).css("position", "absolute");
    $(newNode).css("display", "block");

    if (API.E2020.reviewMode || API.Frame.isComplete()) {
        $("#" + FrameVideoControls.elementIDs.progressLimit).hide();
    }

    this.openSettingsDialog = function()
    {
        var source = video.wrapper.getSource();
        var lastSlash = source.lastIndexOf("/");
        var path = source.substring(0, lastSlash + 1);
        var filename = source.substring(lastSlash + 1);

        $(settingsNode).html("<table style=\"width:100%\"><tr><td>Source:</td><td>" + path + "</td></tr>" +
            "<tr><td>File:</td><td>" + filename + "</td></tr></table>");
        $(settingsNode).dialog("open");
    }

    this.getScrubBarWidth = function () { return $("#" + FrameVideoControls.elementIDs.scrubBar).width(); };

    this.startScrubberDrag = function (evt) {
        FrameVideoControls.selected = true;
        return FrameVideoControls.moveScrubber(evt);
    }

    this.limitScrubberPosition = function (x) {
        var containerLeft = $("#" + FrameVideoControls.elementIDs.scrubber).parent().offset().left;
        var xNew = x - parseInt(containerLeft) - FrameVideoControls.scrubOffset;

        if (xNew < FrameVideoControls.scrubBarLeft - FrameVideoControls.scrubOffset) {
            xNew = FrameVideoControls.scrubBarLeft - FrameVideoControls.scrubOffset;
        }

        if ((!API.E2020.reviewMode && !API.Frame.isComplete()) && xNew > FrameVideoControls.scrubBarLeft - FrameVideoControls.scrubOffset + FrameVideoControls.getScrubBarWidth() * FrameVideoControls.progress) {
            xNew = FrameVideoControls.scrubBarLeft - FrameVideoControls.scrubOffset + FrameVideoControls.getScrubBarWidth() * FrameVideoControls.progress;
        }
        var maxlimit = parseInt($("#" + FrameVideoControls.elementIDs.progressContainer).width());
        if (xNew > maxlimit)
            xNew = maxlimit;
        return xNew;
    }

    this.moveScrubber = function (evt) {
        var x = 0;
        // Get mouse coordinates.  else branch for ie and if branch for all other browsers
        if (evt.originalEvent && evt.originalEvent.touches && evt.originalEvent.touches.length == 1) {
            //var touch = evt.touches[0];
            var touch = evt.originalEvent.targetTouches[0]
            x = touch.pageX;
        } else if (evt) {
            x = evt.pageX;
        } else {
            if (document.documentElement) {
                x = event.clientX + document.documentElement.scrollLeft;
            } else {
                x = event.clientX + document.body.scrollLeft;
            }
        }

        x = FrameVideoControls.limitScrubberPosition(x);
        $("#" + FrameVideoControls.elementIDs.scrubber).css("left", x + "px");

        if (evt && evt.preventDefault) {
            evt.preventDefault();
        }
        else {
            window.event.returnValue = false;
        }
        Actions.Log();
        return false;
    }

    this.mouseMove = function (evt) {
        if (!FrameVideoControls.selected) return;
        return FrameVideoControls.moveScrubber(evt);
    }

    this.mouseUp = function (e) {
        if (FrameVideoControls.selected) {
            var pos = (parseInt(document.getElementById(FrameVideoControls.elementIDs.scrubber).style.left) - FrameVideoControls.scrubBarLeft + FrameVideoControls.scrubOffset) / (FrameVideoControls.getScrubBarWidth());
            var time = video.totalDuration * pos;
            video.wrapper.seek(time);
        }
        FrameVideoControls.selected = false;
        FrameVideoControls.audioSelected = false;
    }

    this.playpause = function () {
        Actions.Log();
        var element = document.getElementById(FrameVideoControls.elementIDs.play);
        if (element.className.toLowerCase() == "play") {
            video.wrapper.play();
            element.className = "pause";
            video.autoplay = true;
            video.firstPlay = false;
        } else {
            video.wrapper.pause();
            element.className = "play";
            video.autoplay = false;
        }
    }

    this.ccBtnClick = function () {
        $("#" + FrameVideoControls.idPrefix + "ccdiv").toggle();
    };

    video.wrapper.addEventListener('Complete', function () {
        $("#" + FrameVideoControls.elementIDs.progressLimit).hide();

        video.videoDone();
    });

    video.wrapper.addEventListener('Playing', function () {
        var element = document.getElementById(FrameVideoControls.elementIDs.play);
        element.className = "pause";
    });

    video.wrapper.addEventListener('Paused', function () {
        var element = document.getElementById(FrameVideoControls.elementIDs.play);
        element.className = "play";
        element.innerHTML = "<a href='javascript:void(0);'>Play</a>"
    });

    video.wrapper.addEventListener("seeking", function () {
        if (!API.E2020.reviewMode && !API.Frame.isComplete()) {
            if (video.video.currentTime > video.maxTimeViewed) {
                video.video.currentTime = video.maxTimeViewed;  //updates the video element
                video.setCurrentTime(video.maxTimeViewed);      //updates the video wrapper
            }                                                   //Both need to be updated in the case where built-in
        }                                                       //browser controls directly alter the video element 
    });

    video.wrapper.addEventListener('PlayheadUpdate', function (seconds, duration) {
        if (video.fileNotFound) { return; }

        try {
            if (!API.E2020.reviewMode && !API.Frame.isComplete()) {
                seconds = (seconds > video.maxTimeViewed) ? video.maxTimeViewed : seconds;
                video.video.playbackRate = 1;
            }

            var floatSeconds = parseFloat(seconds);
            if (FrameVideoControls.scrubBarSeconds != floatSeconds) {

                if (typeof (duration) == "number" && !isNaN(duration)) video.totalDuration = parseFloat(duration);
                var progress = floatSeconds / parseFloat(duration);

                $("#" + FrameVideoControls.elementIDs.played).width(FrameVideoControls.getScrubBarWidth() * progress);
                $("#" + FrameVideoControls.elementIDs.time).html(video.formatTime(seconds) + " / " + video.formatTime(video.totalDuration));
                if ($("#" + FrameVideoControls.elementIDs.progressLimit).position().left < FrameVideoControls.getScrubBarWidth() * progress + FrameVideoControls.scrubBarLeft) {
                    FrameVideoControls.progress = progress;
                    $("#" + FrameVideoControls.elementIDs.progressLimit).css("left", FrameVideoControls.getScrubBarWidth() * progress + FrameVideoControls.scrubBarLeft);
                }

                FrameVideoControls.scrubBarSeconds = floatSeconds;

                var targetPos = FrameVideoControls.getScrubBarWidth() * progress + FrameVideoControls.scrubBarLeft - FrameVideoControls.scrubOffset;

                if (FrameVideoControls.selected) return;

                $("#" + FrameVideoControls.elementIDs.scrubber).css("left", targetPos);

                Actions.Log();

            }
        } catch (err) {
            // console.log("In PlayheadUpdate" + err.message);
        }
    });

    video.wrapper.addEventListener('Buffering', function (percent, duration) {
        if (document) //This event is thrown by a callback and could occur during a frame change.
        {
            video.buffered = percent;
            if ($("#" + FrameVideoControls.elementIDs.buffered).width() < FrameVideoControls.getScrubBarWidth() * percent)
            {
                $("#" + FrameVideoControls.elementIDs.buffered).width(FrameVideoControls.getScrubBarWidth() * percent);
            }
        }
    });

    $(document).bind("touchmove", FrameVideoControls.mouseMove);
    $(document).bind("mousemove", FrameVideoControls.mouseMove);
    $(document).bind("mouseup", FrameVideoControls.mouseUp);
    $(document).bind("touchend", FrameVideoControls.mouseUp);
    $(document).bind("touchcancel", FrameVideoControls.mouseUp);
    $(document).bind('contextmenu', function() { return false; });

    $("#" + FrameVideoControls.elementIDs.scrubber).bind("mousedown", FrameVideoControls.startScrubberDrag);
    $("#" + FrameVideoControls.elementIDs.scrubber).bind("touchstart", FrameVideoControls.startScrubberDrag);
    $("#" + FrameVideoControls.elementIDs.progressContainer).bind("mousedown", FrameVideoControls.startScrubberDrag);

    $("#" + FrameVideoControls.elementIDs.play).bind("click", FrameVideoControls.playpause);

    $("#" + FrameVideoControls.elementIDs.closedCaption).bind("click", FrameVideoControls.ccBtnClick);

    $("#" + FrameVideoControls.elementIDs.volumeSlider).bind("mousemove", function () {
        if (!video.muted)
            video.wrapper.setVolume($("#" + FrameVideoControls.elementIDs.vidVolume).html());
    });

    $("#" + FrameVideoControls.elementIDs.volumeSlider).bind("touchmove", function () {
        if (!video.muted)
            video.wrapper.setVolume($("#" + FrameVideoControls.elementIDs.vidVolume).html());
    });

    $("#" + FrameVideoControls.elementIDs.audioButton).bind("click", function () {
        if (video.muted) {
            video.muted = false;
            this.className = "AudioButton";
            video.wrapper.setVolume(video.volume);
        } else {
            video.muted = true;
            this.className = "AudioButtonMuted";
            video.wrapper.setVolume(0);
        }
    });

    $("#" + FrameVideoControls.elementIDs.sliderMuteButton).bind("click", function () {

        if (video.muted) {
            video.muted = false;
            video.wrapper.setVolume(video.volume);
            $('#slider-mute i').addClass("icon-media-volume2");
            $('#slider-mute i').removeClass("icon-media-mute2");

        } else {
            video.muted = true;
            video.wrapper.setVolume(0);
            $('#slider-mute i').addClass("icon-media-mute2");
            $('#slider-mute i').removeClass("icon-media-volume2");
        }
    });
}

//The topmost video class. This is the only video interface users should be calling directly.
API.CVideo = function () {
    this.selected = false;
    this.width = 800;
    this.height = 450;
    this.filename = "";
    this.server = [];
    this.serverName = [];
    this.serverComma = "";
    this.alive = [];
    this.currentServer = 0;
    this.video;
    this.buffered = 0;
    this.totalDuration = 0.0;
    this.videoArray = [];
    this.startTimes = [];
    this.firstPlay = true;
    this.autoplay = true;
    this.fileNotFound = false;
    this.scrubOffset = 50;
    this.hideEvent = null;
    this.callback = null;
    this.captions = null;
    this.wrapper = null;
    this.muted = false;
    this.volume = 0.5;
    this.frameVideoControls = null;
    this.servers = null;

    var Player = this;
    this.idPrefix = ""; //__player_
    this.elementIDs = new function () {
        this.container = null;
        this.playerContainer = Player.idPrefix + "home_video_container";
        this.jsPlayer = Player.idPrefix + "home_video_js";
        this.frameVideoControls = "frame_video_controls"; //Only a single instance exists.
        this.forcePlay = Player.idPrefix + "forcePlay";
        this.loadingScreen = Player.idPrefix + "video_loading";
        this.fileNotFound = Player.idPrefix + "Video_file_not_found";
    }

    this.callbacks = new Object();

    this.addCallbackListener = function (eventName, callbackFunction) {
        Player.callbacks[eventName] = Player.callbacks[eventName] || new Array();
        Player.callbacks[eventName].push(callbackFunction);
    }

    this.throwEvent = function (eventName) {
        var params = Array.prototype.slice.call(arguments).slice(1);

        if (Player.callbacks[eventName])
            for (var i = 0; i < Player.callbacks[eventName].length; i++) {
                Player.callbacks[eventName][i].apply(this, params);
            }
    }

    this.isiPad = (navigator.userAgent.match(/iPad/i) != null);
    this.isNexus = (navigator.userAgent.match(/Nexus/i) != null);
    this.isGalaxy = (navigator.userAgent.match(/GT-/i) != null);
    this.isIE = (navigator.userAgent.match(/MSIE/i) != null);

    this.supportsAutoPlay = function() {
        if (Player.isiPad || Player.isNexus || Player.isGalaxy) return false;
        return true;
    }

    this.setCallback = function (callback) {
        Player.callback = callback;
    }

    this.lookingForMediaServer = false;
    this.currentMediaServer = "";
    this.currentMediaServerName = "";

    this.mediaServerResponse = function(results)
    {
        try
        {
            if (API.E2020.addresses.mediaLogSuccess) {
                $.ajax({
                    url: API.E2020.addresses.mediaLogSuccess,
                    type: "POST",
                    contentType: 'application/json',
                    data: JSON.stringify({
                        ESData: {
                            filename: results.file,
                            address: results.address,
                            schoolName: API.E2020.schoolName,
                            schoolID:API.E2020.schoolID,
                            districtName: API.E2020.districtName,
                            districtID: API.E2020.districtID,
                            clientIP: results.clientIP,
                            saltID: results.saltID,
                            mediaVersion: results.mediaVersion,
                            viewerID: API.E2020.ViewerID,
                            timeSubmitted: Date.now(),
                            status: "success"
                        },
                        Token: document.cookie.replace(/(?:(?:^|.*;\s*)EdgeToken\s*\=\s*([^;]*).*$)|^.*$/, "$1"),
                        ESSchema: "success"
                    })
                });
            }
        }
        catch(ex)
        {
            console.log("Supressed error in call to " + API.E2020.addresses.mediaLogSuccess)
        }
        console.log(results);
        if (!results.error) {
            for (var i = 0; i < Math.max(Player.servers.length - 1, 1) ; i++) {
                if (Player.servers[i].address == results.address) {
                    Player.servers[i].found = true;
                    Player.servers[i].hasFile = true;
                }
            }

            if (Player.lookingForMediaServer) {
                Player.lookingForMediaServer = false;
                Player.currentMediaServer = results.address;
                Player.currentMediaServerName = results.name;

                // Only update Player.filename if a value is available.
                // Old versions do not supply this value.
                if (results.file) {
                    Player.filename = results.file;
                }

                Player.reloadVideo();
            }
        } else {
            for (var i = 0; i < Math.max(Player.servers.length - 1, 1) ; i++) {
                if (Player.servers[i].address == results.address) {
                    Player.servers[i].found = true;
                    Player.servers[i].hasFile = false;
                }
            }
        }
    }

    this.mediaServerTimeout = function () {
        if (Player.lookingForMediaServer) {
            Player.lookingForMediaServer = false;

            Player.currentMediaServer = Player.servers[Player.servers.length - 1].address;
            Player.currentMediaServerName = Player.servers[Player.servers.length - 1].name;

            Player.reloadVideo();
        }
    }

    this.findMediaServer = function()
    {
        Player.lookingForMediaServer = true;

        for (var i = 0; i < Player.servers.length; i++) {
            Player.servers[i].hasFile = false;
        }

        for (var i = 0; i < Player.servers.length - 1; i++) {
            if (location.protocol == "https:" && Player.servers[i].address.indexOf("http:") == 0)
			{
                continue; //If we're using http, and the request is http, we skip it. It would just fail anyways.
            }
            (function (server) {
                try {
                    $.ajax({
                        url: server.address + Player.filename,
                        type: "HEAD",
                        timeout: 5000,
                        success: function () {
							Player.mediaServerResponse({ address: server.address });
						},
						error: function () {
							if (API.E2020.addresses.mediaLogError) {
								$.ajax({                                  
									url: API.E2020.addresses.mediaLogError,
									type: "POST",
									contentType: 'application/json',
									data: JSON.stringify({
										ESData: {
											filename: Player.filename,
											address: server.address,
											schoolName: API.E2020.schoolName,
											schoolID: API.E2020.schoolID,
											districtName: API.E2020.districtName,
											districtID: API.E2020.districtID,
											viewerID: API.E2020.ViewerID,
											timeSubmitted:Date.now(),
											status: "error"
										},
										Token: document.cookie.replace(/(?:(?:^|.*;\s*)EdgeToken\s*\=\s*([^;]*).*$)|^.*$/, "$1"),
										ESSchema: "error"
									})
								});
							}
						}
					});
                }
                catch (ex) {
                    console.log("Supressed error in call to " + API.E2020.addresses.mediaLogError)
                }
            })(Player.servers[i]);
        }

        if (Player.servers.length == 1) {
            Player.mediaServerTimeout();
        } else {
            setTimeout(Player.mediaServerTimeout, 3000);
        }
    }

    this.videoDone = function () {
        Player.setTimeViewed(0);
        if (Player.callback) {
            Player.callback();
        }
    }

    this.playerLoad = function () {
        if (Player.width == 0) {
            Player.width = 800;
        }
        else if (Player.height == 0) {
            Player.height = Player.width;
        }

        Player.server = [];
        Player.serverName = [];
        Player.serverComma = "";

        //Settings are hardcoded at the moment.
        Player.alive.push(true);
        Player.server.push(API.E2020.addresses.videoFolder);
        Player.serverName.push("qa");
        Player.serverComma = API.E2020.addresses.videoFolder;

        //Player.buildChooseServerList();
        //Player.elementIDs.container.style.position = "relative";
        Player.elementIDs.container.style.backgroundColor = "#000000";

        Player.writePlayer();
        Player.video = document.getElementById(Player.elementIDs.jsPlayer);

        Player.wrapper.addEventListener("FileNotFound", function () {
            Player.fileNotFound = true;
            Player.hideLoadingScreen();
            Player.showFileNotFound();
        });

        Player.wrapper.addEventListener("FileLoaded", function () {
            Player.fileNotFound = false;
            Player.hideLoadingScreen();
            Player.hideFileNotFound();
        });

        Player.video.parentNode.style.display = "";

        Player.wrapper.addEventListener('Playing', function () {
            $("#" + Player.elementIDs.forcePlay).hide();
        });

        Player.video.addEventListener('loadedmetadata', function () {
            Player.totalDuration = Player.video.duration;
            //Player.updateBuffer();
            //if (Player.autoplay) Player.video.play();
        });

        Player.video.addEventListener('timeupdate', function () {
            //Player.throwEvent("PlayheadUpdate", parseFloat(Player.getCurrentTime()));
        });

        Player.video.addEventListener('progress', function () {
            //document.getElementById("testtest").innerHTML = document.getElementById(Player.elementIDs.jsPlayer).buffered.end(0);
        });

        Player.video.addEventListener('error', function () {
            Player.fallback();
        });

        Player.video.addEventListener('loadstart', function () {
            //setTimeout("fallback();", 5000);
        });

        Player.video.addEventListener('ended', function () {
            //Player.playpause();
            Player.videoDone();
        });

        Player.video.addEventListener('stalled', function () {
            // Player.fallback();
        });
    }

    this.getCurrentTime = function () {
        return Player.wrapper.getCurrentPosition();
    }

    this.setCurrentTime = function (time) {
        Player.wrapper.setCurrentPosition(time);
    }

    /*
    this.updateBuffer = function() {
    try
    {
    Player.buffered = Math.round(parseFloat(((document.getElementById(Player.elementIDs.jsPlayer).buffered.end(0) / document.getElementById(Player.elementIDs.jsPlayer).duration) * 100)));
    document.getElementById(Player.elementIDs.buffered).style.width = (Player.getScrubBarWidth() * (Player.buffered / 100)) + "px";
    }catch(ex){} //Ensure buffer updating continues even if an exception occurs.
    if (Player.buffered < 100) setTimeout(Player.updateBuffer, 200);
    }
    */

    this.playUponReady = function () {
        if (Player.supportsAutoPlay()) {
            setTimeout(function () {
                if (Player.video.networkState == 1) {
                    Player.video.play();
                } else {
                    Player.playUponReady();
                }
            }, 100);
        } else {
            document.getElementById(API.Video.frameVideoControls.elementIDs.play).className = "play";
            clearTimeout(Player.hideEvent);
            alert("When using this device you must click play again in order to continue. We apologize for the inconvenience.");
        }
    }

    var fallbackPending = false;
    this.fallback = function () {
        if (fallbackPending == false) {
            fallbackPending = true;
            setTimeout(
                function () {
                    fallbackPending = false;
                    Player.video.src = Player.server[Player.server.length - 1] + Player.filename;
                    Player.video.load();
                    Player.wrapper.seek(Player.maxTimeViewed);
                    Player.playUponReady();
                }, 1000);
        }
    }

    this.loadServer = function (serverID) {
        Player.video.pause();
        Player.video.src = Player.server[serverID] + Player.filename;
        Player.video.load();
        if (Player.autoplay) {
            Player.playUponReady();
        }
        //setTimeout(function() {
        var element = document.getElementById("chooseServer");
        if (element) element.className = "Hidden";
        //}, 1);
    }

    this.pad = function (value) {
        if (value.toString().length == 1) {
            value = "0" + value;
        }
        return value;
    }

    this.formatTime = function (seconds) {
        seconds = parseInt(seconds);
        var minutes = parseInt(seconds / 60);
        var seconds = seconds % 60;
        return minutes + ":" + Player.pad(seconds);
    }

    this.buildChooseServerList = function () {
        var str = "";
        for (var i = 0; i < Player.server.length; i++) {
            if (Player.alive[i])
                str += "<div style=\"cursor:pointer\" onclick=\"Player.loadServer(" + i + ");\">" + Player.serverName[i] + "</div>"; //Player.server[i]
        }
        var element = document.getElementById("chooseServer");
        if (element)
            element.innerHTML = str;
    }

    this.writeSource = function () {
        return "    <source src=\"" + Player.currentMediaServer + Player.filename + "\">"; // type='video/mp4; codecs=\"avc1.42E01E, mp4a.40.2\"'>"
    }

    this.writePlayer = function () {
        var loadingContents = "<div id=\"" + Player.elementIDs.loadingScreen + "\" style=\"position:absolute;left:0;right:0;top:0;bottom:0;background-color:#fff;z-index:999;\"><div style=\"position:absolute;top:45%;width:100%;text-align:center;font-size:20px;font-weight:bold;\">Loading video, please wait...</div></div>";
        var fileNotFoundContents = "<div id=\"" + Player.elementIDs.fileNotFound + "\" style=\"position:absolute;left:0;right:0;top:0;bottom:0;background-color:#fff;z-index:999;display:none;\"><div style=\"position:absolute;top:45%;width:100%;text-align:center;font-size:20px;font-weight:bold;\">Unable to load video file.</div></div>";

        var videoContents = "<div id=\"" + Player.elementIDs.playerContainer + "\" style=\"width:" + Player.width + "px; height:" + Player.height + "px;position:relative;left:0;top:0;\">";

        var autoplay = "";
        if (Player.autoplay) autoplay = "autoplay";

        if (!Player.supportsAutoPlay()) {
            videoContents += "<div id='" + Player.elementIDs.forcePlay + "' class='IpadPlay uibtn-media-play large' onclick=\"API.Video.video.play();$(this).hide();\"></div>";
        }
        videoContents += "<video id=\"" + Player.elementIDs.jsPlayer + "\" class=\"video-js\" width=\"" + Player.width + "\" height=\"" + Player.height + "\" preload webkit-playsinline " + autoplay + ">";
        videoContents += Player.writeSource();
        videoContents += "</video>";
        videoContents += "</div>";

        if (Player.elementIDs.container.innerHTML == "")
            Player.elementIDs.container.innerHTML = loadingContents + fileNotFoundContents + videoContents;

        var captions = new API.Caption(Player.filename, "ccdiv_inner");
        var tagType = "video";
        Player.wrapper = new API.VideoWrapper($("#" + Player.elementIDs.playerContainer).find(tagType)[0], captions);
        Player.frameVideoControls = new API.FrameVideoControls(Player);

        if (Player.isiPad || Player.isNexus || Player.isGalaxy) {
            $('#' + Player.frameVideoControls.elementIDs.volumeButton).hide();
            $('.progress').addClass("progress-mobile");
            $('.cc').addClass("cc-mobile");

            $(document).on('click touchstart', function (e) {
                var container = $('#main_area');
                if (container.has(e.target).length === 0) {
                    $('.vcplayer').css("visibility", "hidden");
                } else {
                    $('.vcplayer').css("visibility", "visible");
                }
            });
        } else {
            $('#main_area').hover(
                function (e) {
                    $('.vcplayer').css("visibility", "visible");
                },
                function (e) {
                    var element = document.getElementById(Player.frameVideoControls.elementIDs.play);
                    if (element && element.className && element.className.toLowerCase() === "pause") {
                        $('.vcplayer').css("visibility", "hidden");
                    }
                });
        }
    };

    this.reloadVideo = function () {
        if (API.E2020.reviewMode || API.Frame.isComplete()) {
            $("#" + API.Video.frameVideoControls.elementIDs.progressLimit).css("display", "none");
        } else {
            $("#" + API.Video.frameVideoControls.elementIDs.progressLimit).css("display", "");
        }
        // resetting the max allowed postion when video loading
        $("#slider-vertical-slider").slider("value", 80);
        $("#ctl00_ContentPlaceHolderBody_upnlFrameArea").hide();
        $("#iFramePreview").hide();
        API.parentWindow.$("#frameAudioControls").hide();
        API.Video.elementIDs.container.style.display = "";
        API.Video.elementIDs.container.style.opacity = "1";
        API.Video.elementIDs.container.style.width = Player.width + "px";
        API.Video.elementIDs.container.style.height = Player.height + "px";

        Player.frameVideoControls.resetDisplay();

        $("#" + Player.elementIDs.frameVideoControls).show();
        Player.wrapper.caption = new API.Caption(Player.filename, "ccdiv_inner");
        Player.video.pause();
        if (Player.isIE) {
            $("#" + API.Video.elementIDs.jsPlayer).html(""); //This was the only method I could get to work consistently. If we leave the source tags, IE will refuse to change addresses more than once.
        }
        Player.video.src = Player.currentMediaServer + Player.filename;
        Player.video.load();
        if (Player.autoplay) {
            setTimeout(function () { Player.wrapper.play(); }, 1000);
        } else {
            $('#' + API.Video.frameVideoControls.elementIDs.play).removeClass('pause').addClass('play');
        }
        //TODO: Put some real race condition handling in here. Maybe a queue.
        Player.getTimeViewed();
    }

    //var videoTimer;   //timer for this window; will be set when the video is ready to play; and will be cleared when paused or buffering
    //var maxTimeViewed = getTimeViewed(); //Will be in seconds for the max time viewed

    this.videoTimer = 0;
    this.maxTimeViewed;
    this.intervalCounter = 0;

    this.SetTimer = function () {
        if (Player.videoTimer) { clearInterval(Player.videoTimer); Player.videoTimer = 0; }
        Player.videoTimer = setInterval(function () { Player.VideoIntervalTimerElapsed(30) }, 1000);
        if (Player.maxTimeViewed === undefined) {
            Player.maxTimeViewed = 0;
        }
    }
    //Updates maxTimeViewed, Api Call Period helps prevent too many API calls
    this.VideoIntervalTimerElapsed = function (ApiCallPeriod) {
        var currentTime = Player.getCurrentTime();

        if (currentTime > Player.maxTimeViewed) {

            Player.maxTimeViewed = currentTime;

            var time = (Player.maxTimeViewed > 5) ? Player.maxTimeViewed - 5 : 0;
            if (Player.intervalCounter >= ApiCallPeriod) {
                Player.setTimeViewed(time);
                Player.intervalCounter = 0;
            }
            else {
                Player.intervalCounter++;
            }


        }

    }

    this.getTimeViewed = function () {
        Player.maxTimeViewed = 0;
        $.ajax({
            debug: true,
            url: API.E2020.addresses.frameService + "FrameChain/GetTimeElapsed",
            data: { learningObjectKey: API.E2020.learningObjectKey, resultKey: API.E2020.resultKey, enrollmentKey: API.E2020.enrollmentKey, frameProgressKey: API.FrameChain.framesProgressIds[API.FrameChain.currentFrame - 1], version: API.E2020.version },
            dataType: 'text',
            type: 'POST',
            success: function (result) {
                Player.maxTimeViewed = parseFloat(result);
                Player.wrapper.seek(Player.maxTimeViewed);
                Player.SetTimer();
            },
            error: function () {
                console.log("Error retrieving Time Viewed");
            }
        });
    };

    this.setTimeViewed = function (time) {
        $.ajax({
            debug: true,
            url: API.E2020.addresses.frameService + "FrameChain/SetTimeElapsed",
            data: { learningObjectKey: API.E2020.learningObjectKey, resultKey: API.E2020.resultKey, enrollmentKey: API.E2020.enrollmentKey, frameProgressKey: API.FrameChain.framesProgressIds[API.FrameChain.currentFrame - 1], time: time, version: API.E2020.version },
            dataType: 'text',
            type: 'POST',
            success: function (result) {

            },
            error: function () {
                console.log("Error setting Max Time Viewed");
            }
        });
    }

    this.hideLoadingScreen = function () {
        $("#" + Player.elementIDs.loadingScreen).hide();
    }

    this.showLoadingScreen = function () {
        $("#" + Player.elementIDs.loadingScreen).show();
    }

    this.hideFileNotFound = function () {
        $("#" + Player.elementIDs.fileNotFound).hide();
    };

    this.showFileNotFound = function () {
        $("#" + Player.elementIDs.fileNotFound).show();
    }

    this.loadVideo = function (element, file, callback) {
        if (element.ownerDocument != window.document) {
            element = document.getElementById("frameArea");
        } else {
            element = $(".FrameArea")[0];
        }

        if (file == null || file == "") {
            file = API.Frame.currentFile();
        }

        //FLV has been replaced by mp4 filetype.
        file = file.replace(".flv", ".mp4");

        //If we haven't included a file extension, add .mp4 as the default.
        if (file.indexOf(".") == -1) {
            file += ".mp4";
        }

        Player.filename = file;
        if (Player.elementIDs.container == null) {
            Player.elementIDs.container = document.createElement("div");
            element.appendChild(Player.elementIDs.container);
            //$(Player.elementIDs.container).css("position", "absolute");+
            $(Player.elementIDs.container).css("left", "0px");
            $(Player.elementIDs.container).css("top", "0px");
            $(Player.elementIDs.container).css("width", Player.width + "px");
            $(Player.elementIDs.container).css("height", Player.height + "px");
            //$(Player.elementIDs.container).css("pointer-events", "none"); //Hides the div from click events
            $(Player.elementIDs.container).css("overflow", "hidden");
            Player.playerLoad();
        }

        //Hide any previous error messages.
        Player.hideFileNotFound();

        Player.setCallback(callback);
        Player.findMediaServer();
    }
}

//We create a single video instance that's reused. This is due to memory issues IE (especially 8) has.
API.Video = new API.CVideo();
