//This class is responsible for handling all instances of non-video audio
API.Audio = new function () {
    this.endCallback = null;
    this.playing = false;
    this.soundQueue = new Array();
    this.beginCallbackQueue = new Array();
    this.endCallbackQueue = new Array();
    this.element = null;
    this.earconElement = null;
    this.audioBeginHandler = function () { };
    this.audioEndHandler = function () { };

    this.setEndCallback = function (callback) {
        API.Audio.endCallback = callback;
    }

    //Setup flash or html5 audio player
    this.writeAudioPlayerToDiv = function () {
        API.Audio.createPlayers();
    }

    //Setup flash or html5 earcon player
    this.writeEarconToDiv = function () {
        API.Audio.createPlayers();
    }

    //Creates flash or html5 players 
    this.createPlayers = function () {
        if (API.Audio.element != null) return;
        //var players = audiojs.createAll();
        //API.Audio.element = players[0]; //TODO: Replace with creation of a dynamic element
        //API.Audio.earconElement = players[1]; //TODO: Replace with creation of a dynamic element

        var ele = document.createElement("audio");
        var div = document.createElement("div");
        div.appendChild(ele);
        document.body.appendChild(div);
        API.Audio.element = audiojs.create(ele, { markup: false, css: false, useFlash: false });
        ele = document.createElement("audio");
        div = document.createElement("div");
        div.appendChild(ele);
        document.body.appendChild(div);
        API.Audio.earconElement = audiojs.create(ele, { markup: false, css: false, useFlash: false });

        API.Audio.element.trackEnded = function () {
            API.Audio.complete();
        }
        API.Audio.element.settings.loadError = function () {
            API.Audio.IOError();
        }
        $("#invis-o-div").on("click", function () {  API.Audio.element.play(); });
    }

    //Really just pauses audio
    this.stopAudio = function () {
        if (API.Audio.element && !!API.Audio.element.pause) {
            API.Audio.element.pause();
            API.Audio.soundQueue = [];
            API.Audio.endCallbackQueue = [];
            API.Audio.beginCallbackQueue = []
        }
    }

    //Plays non-blocking sound tracks such as a correct or incorrect ding.
    this.playEarcon = function (file) {

        //iFrameNotify.notify({
        //    frame: window.parent,
        //    message: "playAudio",
        //    data: { file: file, player: "alternate" },
        //    callback: function (d) {
        //        if (!d || !d.played) {
                    API.Audio.writeEarconToDiv();
                    API.Audio.playEarconInner(file);
        //        }
        //    },
        //    timeout: 500
        //});

        
    }

    //The eval calls within this function are necessary due to a firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=648365
    //We moved the players to the outter frame to avoid the firefox bug, and stripped out the evals.
    this.playEarconInner = function (file) {
        if (API.Audio.earconElement) {
            if (!API.Audio.earconElement.played && !API.Audio.earconElement.paused && !API.Audio.earconElement.ended && 0 < API.Audio.earconElement.currentTime) {
                API.Audio.earconElement.pause();
            }

            API.Audio.earconElement.load(file);

            //The setTimeout logic is necessary in FF (a flash method race condition of some sort).
            var playTimeout = function () {
                try {
                    API.Audio.earconElement.play();
                } catch (ex) {
                    setTimeout(playTimeout, 100);
                    //TODO: Iterative limit?
                }
            }
            playTimeout();
        }
    }

    this.playAudioNow = function (file) {
        API.Audio.writeAudioPlayerToDiv();
        API.Audio.playAudioInner(file);
    }

    //The eval calls within this function are necessary due to a firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=648365
    //We moved the players to the outter frame to avoid the firefox bug, and stripped out the evals.
    this.playAudioInner = function (file) {
        if (API.Audio.element)
        {
            if (!API.Audio.element.played && !API.Audio.element.paused && !API.Audio.element.ended && 0 < API.Audio.element.currentTime){
                API.Audio.element.pause();
            }
            
            API.Audio.element.load(file);

            //The setTimeout logic is necessary in FF (a flash method race condition of some sort).
            var playTimeout = function () {
                try{
                    API.Audio.element.play();
                } catch (ex) {
                    setTimeout(playTimeout, 100);
                    //TODO: Iterative limit?
                }
            }
            playTimeout();
        }
    }

    //Allows custom begin and end event handlers.
    this.playAudioEx = function (file, begin, end, useDefaultHandler) {
        if (useDefaultHandler == undefined) useDefaultHandler = false;
        API.Audio.queueAudio(file, end, begin, useDefaultHandler);
    }

    //Allows custom end event handler.
    this.PlayAudio = function (file, end) {
        API.Audio.playAudio(file, end);
    }

    //Typical call to play a blocking audio track.
    this.playAudio = function (file, end) {
        API.Audio.queueAudio(file, end);
    }

    //Play the audio if the queue is empty, or push it back for later.
    this.queueAudio = function (file, endCallback, beginCallback, useDefaultHandler) {
        //If the filename did not include the extension we can safely assume it is .mp3
        if (file.indexOf(".mp3") == -1) {
            file += ".mp3";
        }

        if (file.indexOf("http://") == -1 && file.indexOf("/") == -1) {
            var location = API.childWindow.window.location.href;
            var lastIndex = location.lastIndexOf("/");
            if (lastIndex != -1) {
                file = location.substring(0, lastIndex + 1) + file;
            }
        }

        if (useDefaultHandler == undefined) useDefaultHandler = true;

        API.Audio.soundQueue.push(file);

        if (useDefaultHandler && API.Audio.audioBeginHandler && beginCallback) {
            API.Audio.beginCallbackQueue.push(function () { beginCallback(); API.Audio.audioBeginHandler(); });
        } else if (useDefaultHandler && API.Audio.audioBeginHandler) {
            API.Audio.beginCallbackQueue.push(API.Audio.audioBeginHandler);
        } else if (beginCallback) {
            API.Audio.beginCallbackQueue.push(beginCallback);
        } else {
            API.Audio.beginCallbackQueue.push(function () { });
        }

        if (useDefaultHandler && API.Audio.audioEndHandler && endCallback) {
            API.Audio.endCallbackQueue.push(function () { endCallback(); API.Audio.audioEndHandler(); });
        } else if (useDefaultHandler && API.Audio.audioEndHandler) {
            API.Audio.endCallbackQueue.push(API.Audio.audioEndHandler);
        } else if (endCallback) {
            API.Audio.endCallbackQueue.push(endCallback);
        } else {
            API.Audio.beginCallbackQueue.push(function () { });
        }

        if (API.Audio.playing) {
            return;
        }

        API.Audio.playNextItem();
    }

    //Called from audio player, calls the end event handler, and plays the next audio track.
    this.complete = function (failed) {
        API.Audio.playing = false;
        if (API.Audio.endCallback) {
            API.Audio.endCallback();
        }

        API.Audio.playNextItem();
    }

    //Play the next item in the queue
    this.playNextItem = function()
    {
        if (API.Audio.soundQueue.length > 0) {
            var file = API.Audio.soundQueue.shift();

            var beginCallback = null;
            if (API.Audio.beginCallbackQueue.length > 0) {
                beginCallback = API.Audio.beginCallbackQueue.shift();
            }

            try {
                if (beginCallback) beginCallback();
            } catch (ex) {
                console.log("complete : Exception thrown while calling beginCallback - " + ex.message);
            }


            var endCallback = null;
            if (API.Audio.endCallbackQueue.length > 0) {
                endCallback = API.Audio.endCallbackQueue.shift();
            }
            API.Audio.setEndCallback(endCallback);
            API.Audio.playing = true;

            //iFrameNotify.notify({
            //    frame: window.parent,
            //    message: "playAudio",
            //    data: { file: file },
            //    callback: function (d) {
            //        if (!d || !d.played) {
                        API.Audio.playAudioNow(file);
            //        }
            //        else
            //            API.Audio.complete();
            //    },
            //    timeout: 500
            //});
        }
    }

    //Called from audio player
    this.IOError = function () {
        console.log("Audio player ioerror");

        //If the entry or exit audio fails to load, it probably doesn't exist, so we shouldn't fire off the event showing the button.
        API.Audio.complete(true);
    }
}
