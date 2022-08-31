if (typeof console === "undefined") {
    console = { log: function () { } };
}

iFrameNotify.listen("exit", function (e, cb) {
    iFrameNotify.notify({ frame: window.parent, message: "setOptions", data: { overrideExitCallback: true } });
    saveFrameChain();
});

saveFrameChain = function (redirect, callback) {

    window.location.href = API.E2020.addresses.frameService + "FrameChain/SaveAndExit/" + API.E2020.learningObjectKey + "/" + API.E2020.resultKey + "/" + API.E2020.enrollmentKey;

};

API.Frame.loadQuestions = function () {
    API.childWindow.$("[qid]").each(function (index) {
        Actions.Log();
        var container = this;
        var stack = API.childWindow.$(container).parents("[fstack]");

        $.ajax({
            debug: true,
            url: API.E2020.addresses.frameService + "FrameChain/GetAssessmentQuestionAjax/" + API.E2020.learningObjectKey + "/" + API.E2020.resultKey + "/" + API.E2020.enrollmentKey,
            data: { taskKey: $(this).attr("qid"), fpId: API.FrameChain.framesProgressIds[API.FrameChain.currentFrame - 1], userID: API.E2020.userID, userToken: API.E2020.userToken, showAnswer: (API.E2020.showCorrectMode && API.E2020.frameProgressID == 0), version: API.E2020.version },
            dataType: 'json',
            type: 'POST',
            xhrFields: {
                withCredentials: true
            },
            success: function (data) {
                $(container).html(data.content);

                API.Utilities.proxifyLinks($(container));

                /////These lines are necessary to fix a bug in IE8 where dynamic content added to a container does not always cause a scrollbar to become visible: Fogbugz #8626, 8648, etc...
                var overflow = API.childWindow.$(".content").css("overflow");
                if (overflow == "auto") {
                    API.childWindow.$(".content").css("overflow", "hidden");
                    API.childWindow.$(".content").css("overflow", "auto");
                }
                /////
                /*
                if(data.answered)
                {
                $(container).parents().show();
                API.childWindow.$("[fstack]:eq(" + (API.childWindow.$("[fstack]").index(stack) + 1) + ")").show();
                $(container).parent().find("img[fdone]").css("display", "none");
                }
                */
                if (data.isAttempted) {
                    stack.find("[fdone]").each(function () {
                        if (this.className.indexOf("-start") != -1)
                            API.Frame.setDoneButtonState(this, "retry");
                    });
                }
            },
            fail: function (handler, text) {
                console.log(text);
            }
        });
    });

    API.Frame.loadStackState();
}

//Source: http://msdn.microsoft.com/en-us/library/ms537509(v=vs.85).aspx
function getInternetExplorerVersion()
// Returns the version of Internet Explorer or a -1
// (indicating the use of another browser).
{
    var rv = -1; // Return value assumes failure.
    if (navigator.appName == 'Microsoft Internet Explorer') {
        var ua = navigator.userAgent;
        var re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
        if (re.exec(ua) != null)
            rv = parseFloat(RegExp.$1);
    }
    return rv;
}

API.Audio.audioBeginHandler = function () {
    if (!API.E2020.freeMovement) API.parentWindow.$("#invis-o-div").show();
}

API.Audio.audioEndHandler = function () {
    API.parentWindow.$("#invis-o-div").hide();
}

API.FrameChain.nextFrame = function () {
    if (!API.Frame.isComplete()) {
        API.Frame.complete(function (success) { if (success) { API.FrameChain.nextFrame(); } });
        return;
    }
    if (API.FrameChain.isComplete() && !API.FrameChain.submitted) {
        API.FrameChain.complete();
        return;
    }

    if (API.FrameChain.currentFrame < API.FrameChain.framesStatus.length) {
        API.FrameChain.openFrame(API.FrameChain.currentFrame + 1);
    }
}

API.FrameChain.openFrame = function (order) {
    if (API.FrameChain.frameUpdateInProgress) return;
    if (!API.E2020.freeMovement && order >= 2 && API.FrameChain.framesStatus[order - 2] != "complete") {
        return;
    }

    $("#btnEntryAudio").css("display", "none");
    $("#btnExitAudio").css("display", "none");
    $(".frameCaptions").css("display", "none");
    $(".stop-marker").css("display", "none");

    try {
        $('#vid_volume').change();
    } catch (ex) { } //Suppress any exceptions that might occur in IE8. We're okay with the call failing.

    API.Frame.entryAudioFilename = null;
    API.Frame.exitAudioFilename = null;
    API.Frame.hintAudioFilename = null;
    API.Frame.showMeVideoFilename = null;

    API.Frame.showHideReplayText();
    $('#iFramePreview').attr('src', API.FrameChain.frameAddresses[order - 1]);
    if (API.FrameChain.turnOffClosedCaptions) {
        API.FrameChain.turnOffClosedCaptions();
    }

    //Stop current audio from playing
    API.Audio.soundQueue = new Array();
    API.Audio.callBackQueue = new Array();
    API.Audio.playing = false;
    try {
        API.Audio.stopAudio();
    } catch (ex) { } //Suppress any exceptions that might occur in IE8. We're okay with the call failing.
    API.FrameChain.updateFramesStatus(API.FrameChain.framesStatus, order);

    //Display frame window
    if (API.Video.elementIDs.container && API.Video.elementIDs.container.parentNode) {
        try {
            API.Video.wrapper.stop();
            API.Video.wrapper.theVideo.executeFlashFunction("disconnect");
        } catch (ex) { }
        $("#" + API.Video.frameVideoControls.elementIDs.progress).css("left", "0");
        if (getInternetExplorerVersion() == -1) {
            API.Video.elementIDs.container.style.width = "1px";
            API.Video.elementIDs.container.style.height = "1px";
            API.Video.elementIDs.container.style.opacity = "0.01";
        } else {
            API.Video.elementIDs.container.style.display = "none";
        }
        $("#" + API.Video.elementIDs.frameVideoControls).hide();
        //destroy();
        $("#ctl00_ContentPlaceHolderBody_upnlFrameArea").show();
        $("#iFramePreview").show();
        //$("#" + API.Video.elementIDs.playerContainer).hide();
    }

    function setNoTranslate() {
        if (API.E2020.setDoNotTranslate === "true" && API.E2020.toolbarOptions.substr(7, 1) === "1") {
            var content = document.getElementsByClassName("content")[0];
            if (content !== undefined) {
                instance = parent.findAndReplaceDOMText(content, {
                    find: /[\+\-\u00F7\u00D7\u2014\u2013\u21D2\u2265=]/g,
                    replace: function (portion, match) {
                        called = true;
                        var el = document.createElement('span');
                        el.setAttribute("no-translate", "true");
                        el.innerHTML = portion.text;
                        return el;
                    },
                    forceContext: parent.findAndReplaceDOMText.NON_INLINE_PROSE
                });
            }
        }
    };

    var myFrame = document.getElementById('iFramePreview');

    $('#iFramePreview').ready(function () {
        setTimeout(function () { myFrame.contentWindow.eval(setNoTranslate.toString() + ' setNoTranslate();'); }, 600);
    });

    function textNoTranslation() {
        setTimeout(function () {
            $("#mainSVG").find("text.dragButtonLabel.unselectable").attr("no-translate", "true");
            $("#mainSVG").find("text.tubeLabel.unselectable").attr("no-translate", "true");
        }, 600);
    };

    var myFrame = document.getElementById('iFramePreview');

    $('#iFramePreview').ready(function () {
        setTimeout(function () { myFrame.contentWindow.eval(textNoTranslation.toString() + ' textNoTranslation();'); }, 600);
    });
}

API.Frame.loadFrameProgress = function () {
    //If the frame hasn't yet loaded, give it 200ms.
    if (!API.childWindow || !API.childWindow.$) {
        setTimeout(API.Frame.loadFrameProgress, 200);
        return;
    }
    if (API.E2020.showCorrectMode) {
        API.childWindow.$("[fstack]").each(function () {
            API.childWindow.$(this).parents().show();
            API.childWindow.$(this).show();
        });

        API.childWindow.$("[fdone]").each(function () {
            API.Frame.setDoneButtonState(this, "complete");
        });
    } else {
        API.Frame.loadStackProgress(function () {
            var complete = true;
            var stackRequiresCheckButton = true;
            var isFirstIncompleteStack = true;

            if (API.Frame.StackProgress.length == 0 && API.FrameChain.framesStatus.length == 1) {
                complete = false;
            }

            for (var i = 0; i < API.Frame.StackProgress.length; i++) {
                var stack = API.childWindow.$("[fstack]:eq(" + i + ")");
                var button = stack.find("[fdone]");

                if (API.Frame.StackProgress[i].Complete) {
                    //If the button exists, mark it complete.
                    if (button.length) {
                        API.Frame.setDoneButtonState(button[0], "complete");
                    }

                    //Show the next stack.
                    API.childWindow.$("[fstack]:eq(" + (i + 1) + ")").parents().show();
                    API.childWindow.$("[fstack]:eq(" + (i + 1) + ")").show();


                } else {
                    complete = false;
                    if (isFirstIncompleteStack) {
                        isFirstIncompleteStack = false;

                        //If there is no button, and the stack does not contain any questions, then do not show the check button.
                        if (!button.length) {
                            for (var j = 0; j < API.Frame.StackProgress[i].TaskProgress.length; j++) {
                                if (!API.Frame.StackProgress[i].TaskProgress[j].IsQuestion) {
                                    stackRequiresCheckButton = false;
                                }
                            }
                        }
                    }
                }

            }


            if (API.Frame.enableCheckButton && stackRequiresCheckButton && !complete && !API.Frame.isComplete()) {
                API.parentWindow.$("#btnCheck").show();
            } else {
                API.parentWindow.$("#btnCheck").hide();
            }

            if (!API.Frame.isComplete() && complete && !(API.Frame.entryAudioFilename && !API.Frame.hasEntryAudioPlayed)) {
                API.Frame.complete();
            }
        });
    }
}

API.Frame.hintAudioAvailable = function (status) {
    if (status) {
        API.parentWindow.$("#btnHint").show();
    } else {
        API.parentWindow.$("#btnHint").hide();
    }
}

API.Frame.showMeVideoAvailable = function (status) {
    if (status) {
        API.parentWindow.$("#btnShowMe").show();
    } else {
        API.parentWindow.$("#btnShowMe").hide();
    }
}

API.Frame.completeTask = function (guid) {
    $.ajax({
        debug: true,
        url: API.E2020.addresses.frameService + "FrameChain/CompleteTaskAjax/" + API.E2020.learningObjectKey + "/" + API.E2020.resultKey + "/" + API.E2020.enrollmentKey + "?taskGuid=" + guid + "&userID=" + API.E2020.userID + "&userToken=" + API.E2020.userToken + "&fpId=" + API.FrameChain.framesProgressIds[API.FrameChain.currentFrame - 1] + "&version=" + API.E2020.version,
        dataType: 'json',
        type: 'POST',
        xhrFields: {
            withCredentials: true
        },
        success: function (data) {
            console.log(data);
            API.Frame.complete();
            API.Frame.loadFrameProgress();
        },
        fail: function (handler, text) {
            console.log(text);
        }
    });
}

API.Frame.highlightNextFrameButton = function () {
    $(".FrameRight").addClass("FrameHighlight");
    for (i = 0; i < 1; i++) {
        $(".FrameRight").fadeTo('slow', 0.5).fadeTo('slow', 1.0).fadeTo('slow', 0.5).fadeTo('slow', 1.0).fadeTo('slow', 0.5).fadeTo('slow', 1.0);
    }
    setTimeout(function () { $(".FrameRight").removeClass("FrameHighlight"); }, 3000);
}

API.Frame.complete = function (callback) {
    $.ajax({
        debug: true,
        url: API.E2020.addresses.frameService + "FrameChain/CompleteFrame/" + API.E2020.learningObjectKey + "/" + API.E2020.resultKey + "/" + API.E2020.enrollmentKey,
        dataType: 'json',
        data: { frameOrder: API.FrameChain.currentFrame, version: API.E2020.version },
        type: 'POST',
        xhrFields: {
            withCredentials: true
        },
        success: function (results) {
            console.log(results);

            if (typeof (results) == "string") results = eval(results);

            var completeChange = (!API.Frame.isComplete() && results[API.FrameChain.currentFrame - 1] == "complete");
            var completeChange = completeChange.replace("incomplete", "complete")

            API.FrameChain.updateFramesStatus(results, API.FrameChain.currentFrame);

            if (completeChange) {
                Actions.Log();
                if (!API.Frame.callOnExit()) {
                    if (!API.Frame.playExitAudio()) {
                        API.Frame.highlightNextFrameButton();
                        if (API.FrameChain.isComplete()) {
                            API.FrameChain.complete();
                        }
                    }
                }
            }
            else {
                if (!API.FrameChain.submitted && API.FrameChain.isComplete()) {
                    API.FrameChain.complete();
                }
            }

            if (typeof (callback) == "function") {
                callback(API.Frame.isComplete());
            }
        },
        fail: function (handler, text) {
            console.log(text);
        }
    });
}

API.FrameChain.complete = function () {
    window.location = API.E2020.addresses.frameService + "FrameChain/Submit/" + API.E2020.learningObjectKey + "/" + API.E2020.resultKey + "/" + API.E2020.enrollmentKey;
}
API.Frame.completeTaskInProgress = false;
API.Frame.completeTask = function (guid) {
    $.ajax({
        debug: true,
        url: API.E2020.addresses.frameService + "FrameChain/CompleteTaskAjax/" + API.E2020.learningObjectKey + "/" + API.E2020.resultKey + "/" + API.E2020.enrollmentKey + "?taskGuid=" + guid + "&fpId=" + API.FrameChain.framesProgressIds[API.FrameChain.currentFrame - 1] + "&version=" + API.E2020.version,
        dataType: 'json',
        type: 'POST',
        xhrFields: {
            withCredentials: true
        },
        beforeSend: function () {
            API.Frame.completeTaskInProgress = true;
        },
        success: function (data) {
            console.log(data);
            API.Frame.complete();
            API.Frame.loadFrameProgress();
        },
        fail: function (handler, text) {
            console.log(text);
        },
        complete: function () {
            API.Frame.completeTaskInProgress = false;
        }
    });
}

API.Frame.showEntryButton = function () {
    $("#btnEntryAudio").show();
    API.Frame.showHideReplayText();

    if (!API.Frame.isComplete()) {
        API.Frame.complete();
    }
    API.Frame.hasEntryAudioPlayed = true;
}

API.Frame.showExitButton = function () {
    $("#btnExitAudio").show();
    API.Frame.showHideReplayText();

    API.Frame.highlightNextFrameButton();

    if (API.FrameChain.isComplete() && !API.FrameChain.serverComplete) {
        API.FrameChain.complete();
    }
    API.Frame.hasExitAudioPlayed = true;
}

/*
API.Question.attempt = function () {
    console.log("Attempting of questions is disabled");
}
*/

API.Frame.showHideReplayText = function () {
    if (jQuery("#btnEntryAudio").css("display") != "none" || jQuery("#btnExitAudio").css("display") != "none") {
        jQuery("#replayAudioText").show();
    } else {
        jQuery("#replayAudioText").hide();
    }
}

API.FrameChain.renderNavigationIcons = function (values) {
    if ($(".FramesList .FrameLeft").length == 0) {
        API.parentWindow.$(".FramesList").append("<li class='FrameLeft' onclick = 'API.FrameChain.backFrame();' > <a href='#_'>Go Left</a></li>");
    }
    for (var i = 0; i < values.length; i++) {
        var completeClass = "";
        if (API.FrameChain.framesStatus[i] == "complete") {
            completeClass = " FrameComplete";
        }

        if (i == API.FrameChain.currentFrame - 1) {
            if ($("#frame" + (i + 1)).length) {
                $("#frame" + (i + 1)).addClass("FrameCurrent");
                if (completeClass != "") {
                    $("#frame" + (i + 1)).addClass(completeClass);
                }
            } else {
                API.parentWindow.$(".FramesList").append("<li id=\"frame" + (i + 1) + "\" class=\"FrameCurrent" + completeClass + "\" onclick=\"API.FrameChain.openFrame(" + (i + 1) + ");\"><a href=\"#_\">Frame 2</a></li>");
            }
        }
        else if ($("#frame" + (i + 1)).length) {
            $("#frame" + (i + 1)).removeClass("FrameCurrent");
            if (completeClass != "") {
                $("#frame" + (i + 1)).addClass(completeClass);
            }
        } else {
            API.parentWindow.$(".FramesList").append("<li id=\"frame" + (i + 1) + "\" class=\"" + completeClass + "\" onclick=\"API.FrameChain.openFrame(" + (i + 1) + ");\"><a href=\"#_\">Frame 2</a></li>");
        }
    } 
    if ($(".FramesList .FrameRight").length == 0) {
        API.parentWindow.$(".FramesList").append("<li class='FrameRight' onclick = 'API.FrameChain.nextFrame();' > <a href='#_'>Go Right</a></li>");
    }
    $("#frameProgress").text(API.FrameChain.currentFrame + " of " + values.length);
}
