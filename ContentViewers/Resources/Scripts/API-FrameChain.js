//This controls most frame specific functions.
API.Frame = new function () {
    var Frame = this;
    this.progressID = 0;
    this.pendingInit = true;

    this.questions = new Array();
    this.tasks = new Array();
    this.StackProgress = [];

    //This returns the filename of the current frame being used, minus the extension.
    this.currentFile = function () {
        var url = API.childWindow.location.href;
        url = url.substring(0, url.lastIndexOf('.'));
        if (url.lastIndexOf("/") != -1) {
            url = url.substring(url.lastIndexOf("/") + 1);
        }
        return url;
    }

    //This returns the full path of the frame being used, minus the extension.
    this.currentPathAndFile = function () {
        var url = API.childWindow.location.href;
        url = url.substring(0, url.lastIndexOf('.'));
        return url;
    }

    //This returns the filename of the frame being used, with the extension included.
    this.currentPath = function () {
        var url = API.childWindow.location.href;
        url = url.substring(0, url.lastIndexOf('/') + 1);
        return url;
    }

    //This is great for browsers that support CORS, but due to IE's lack of support we no longer use this.
    this.fileExists = function (file, success, error) {
        API.childWindow.$.ajax({
            debug: true,
            type: "HEAD",
            url: file,
            success: success,
            error: error,
            debug: true
        });
    }

    this.audioComplete = function (type) {

    }

    this.playHintAudio = function () {
        Frame.playAudio(Frame.hintAudioFilename);
        Actions.Log();
    }

    this.check = function () {
        var firstIncompleteStack = -1;
        for (var i = 0; i < API.Frame.StackProgress.length; i++) {
            if (!API.Frame.StackProgress[i].Complete) {
                firstIncompleteStack = i;
                break;
            }
        }
        if (firstIncompleteStack != -1) {
            API.childWindow.$("[fstack]").eq(firstIncompleteStack).find("[fdone]:not(.done-complete)").first().click();
        }
        if (API.Frame.StackProgress.length == 0) {
            API.Frame.complete();
        }
    }

    //Evaluates any javascript found in the specified attribute of the first jquery object passed in.
    this.evalTagAttribute = function (jQueryElement, attributeName) {
        var code = jQueryElement.attr(attributeName);
        if (code != undefined) {
            try {
                eval(code);
                return true;
            } catch (ex) {
                console.log("evalTagAttribute : exception evaluating code on selector: '" + jQueryElement.selector + "' , attribute name: '" + attributeName + "'");
            }
        }
        return false;
    }

    //Eval the javascript in the onentry attribute of the body tag.
    this.callOnEntry = function () {
        return Frame.evalTagAttribute(API.childWindow.$("body"), "onentry");
    }

    //Play the entry audio for this frame and then display the entry button if successful.
    this.playEntryAudio = function (filename) {
        Actions.Log();
        if (filename) {
            Frame.entryAudioFilename = filename;
        }
        if (Frame.entryAudioFilename != undefined && Frame.entryAudioFilename != null) {
            Frame.playAudio(Frame.entryAudioFilename, Frame.showEntryButton);
            return true;
        } else {
            return false;
        }
    }

    //Eval the javascript in the onexit attribute of the body tag.
    this.callOnExit = function () {
        return Frame.evalTagAttribute(API.childWindow.$("body"), "onexit");
    }

    //Play the exit audio for this frame and then display the entry button if successful.
    this.playExitAudio = function (filename) {
        Actions.Log();
        if (filename) {
            Frame.exitAudioFilename = filename;
        }
        if (Frame.exitAudioFilename != undefined && Frame.exitAudioFilename != null) {
            Frame.playAudio(Frame.exitAudioFilename, Frame.showExitButton);
            return true;
        } else {
            return false;
        }
    }

    this.playAudio = function (file, endCallback, beginCallback, useDefaultHandler) {
        //If the filename did not include the extension we can safely assume it is .mp3
        if (file.indexOf(".mp3") == -1) {
            file += ".mp3";
        }

        //If the path is relative, append the audio folder path.
        if (file.indexOf("http://") == -1 && file.indexOf("/") == -1) {
            var location = API.childWindow.window.location.href;
            var lastIndex = location.lastIndexOf("/");
            if (lastIndex != -1) {
                file = location.substring(0, lastIndex + 1) + file;
            }
        }

        API.Audio.queueAudio(file, endCallback, beginCallback, useDefaultHandler);
    }

    //This should be overridden by the page using the API.
    this.showEntryButton = function () {
        console.log("showEntryButton");
    }

    //This should be overridden by the page using the API.
    this.showExitButton = function () {
        console.log("showExitButton");
    }

    //This should be overridden by the page using the API.
    this.complete = function () {
        if (API.E2020.autoPlayAudio) {
            Frame.playExitAudio();
        }
        console.log("API.Frame.Complete: override to implement");
    }

    //This is usually used in conjunction with custom tasks, which are often flash interactives.
    this.completeTask = function (guid) {
        if (API.E2020.frameProgressID == 0) {
            var doneButton = API.childWindow.$("[taskid=" + guid + "]").parents("[fstack]").find("[fdone]");
            if (doneButton.length) setDoneButtonState(doneButton[0], "complete");
            API.childWindow.$("[fstack]:eq(" + (API.childWindow.$("[fstack]").index(API.childWindow.$("[taskid=" + guid + "]").parents("[fstack]")) + 1) + ")").show();
        }
    }

    //This should be overridden by the page using the API.
    this.openFrame = function (order) {
        console.log("override to implement");
    }

    //Opens a link after turning it into a string digestible by the proxy service.
    this.openProxyWindow = function (address) {
        if (API.E2020.useProxy) {
            Frame.loadBrowser(address);
        }
        else {
            window.open(address, "_blank");
        }
    }

    this.loadBrowser = function (address) {
        try {

            $.ajax({
                debug: true,
                url: API.E2020.addresses.frameService + "Emissary/RedirectWeblink?address=" + encodeURIComponent(address)
                    + "&toolbar=" + encodeURIComponent(API.E2020.toolbarOptions)
                    + "&lang=" + encodeURIComponent(API.E2020.preferredLanguage)
                    + "&student=" + encodeURIComponent(API.E2020.studentBuildId),
                dataType: 'json',
                type: 'POST',
                xhrFields: {
                    withCredentials: true
                },
                success: function (data) {
                    if (data.address) {
                        window.open(data.address, "_blank");
                    }
                },
                fail: function (handler, text) {
                    console.log(text);
                }
            });
        }
        catch (ex) { alert("Unable to proxify link."); }
    }

    this.proxifyWebLinksTimeout;
    //Setup an onclick event handler on all a tags in the frame to use the proxy service.
    this.proxifyWeblinks = function () {
        

            if (API.childWindow) {
                API.childWindow.$("a").each(function () {
                    var $this = $(this);
                    var rid;
                    // replace with gizmoLink for gizmos
                    if (!!$this.data("gizmo")) {
                        this.target = "_blank";
                        this.href = API.E2020.addresses.gizmoService + "?id=" + $this.data("gizmo");
                    }
                    else if (this.href.match(/explorelearning/) && (rid = /resourceid=(\d+)/gi.exec(this.href)) )
                    {
                        this.target = "_blank";
                        this.href = API.E2020.addresses.gizmoService + "?id=" + rid[1];
                    }
                        //Do not proxify a tags that contain javascript in their href attribute.
                        // chrome now sometimes returns <a href='#tab'> as the full url, ending with #tab, so we check that too
                    else if (API.E2020.useProxy && !this.href.toLowerCase().match(/javascript:|^#/)
                        && (this.href.indexOf(API.childWindow.location.href + '#') == -1)
                    ) {
                        this.target = "_blank";
                        this.href = API.E2020.addresses.frameProxyLinks + "Emissary/OpenEmissaryLink/?a=" + encodeURIComponent(this.href.replace("https://","http://"))
                            + "&t=" + encodeURIComponent(API.E2020.toolbarOptions || "")
                        + "&l=" + encodeURIComponent(API.E2020.preferredLanguage || "")
                        + "&s=" + encodeURIComponent(API.E2020.studentBuildId || "");
                        $(this).click(function () { Actions.Log(); });
                    }
                });

            }
    }

    //Modify a nodes class name to signify stack state change.
    this.setDoneButtonState = function (element, state) {
        var subsets = element.className.split("-");
        if (subsets[0] == "") subsets[0] = "done";
        element.className = subsets[0] + "-" + state;
    }

    //Pulls back the current state of a stack and updates the button associated with it.
    this.loadStackState = function () {
        if (API.E2020.showCorrectMode) {
            API.childWindow.$("[fdone]").each(function () {
                Frame.setDoneButtonState(this, "complete");
            });
        } else {
            API.childWindow.$("[fstack]").each(function (index) {
                var stack = this;
                $.ajax({
                    debug: true,
                    url: API.E2020.addresses.frameService + "FrameChain/GetStackState/" + API.E2020.learningObjectKey + "/" + API.E2020.resultKey + "/" + API.E2020.enrollmentKey,
                    data: { stackOrder: (index + 1), fpId: API.FrameChain.framesProgressIds[API.FrameChain.currentFrame - 1], userID: API.E2020.userID, userToken: API.E2020.userToken, version: API.E2020.version },
                    dataType: 'json',
                    type: 'POST',
                    xhrFields: {
                        withCredentials: true
                    },
                    success: function (data) {
                        if (data.complete) {
                            $(stack).find("[fdone]").each(function () {
                                Frame.setDoneButtonState(this, "complete");
                            });
                        } else {
                            $(stack).find("[fdone]").each(function () {
                                Frame.setDoneButtonState(this, "start");
                            });
                        }
                    },
                    fail: function (handler, text) {
                        console.log(text);
                    }
                });
            });
        }
    }

    this.injectScript = function (scriptLocation, onLoad) {
        var head = API.childWindow.document.head;
        if ($(head).find('[src="' + scriptLocation + '"]').length == 0) {
            var script = API.childWindow.document.createElement("script");
            
            if (onLoad) {
                script.onload = onLoad;
            }

            script.type = "text/javascript";
            script.src = scriptLocation;

            head.appendChild(script);
        }
    }

    //Load all questions on the page.
    this.loadQuestions = function () {
        API.childWindow.$("[qid]").each(function (index) {
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

                    if ($(container).find('textarea')) {
                        API.Frame.injectScript(API.E2020.addresses.wysiwygBasePath + '/CKEditor/ckeditor.js', function() {
                            API.Frame.injectScript(API.E2020.addresses.wysiwygBasePath + '/CKEditor/wysiwyg.js', function () {
                                //init the wysiwyg
                                $(container).find('textarea').each(function () {
                                    API.childWindow.edgenuity.wysiwyg.initializeToolbar(this.name, 'Short', true);
                                });
                            });
                        });
                    }

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
                                Frame.setDoneButtonState(this, "retry");
                        });
                    }

                    try
                    {
                        $(function (){$(".JQueryTabbify").tabs();});
                    }catch(ex){ console.log("Unable to setup JQuery tabs."); }
                },
                fail: function (handler, text) {
                    console.log(text);
                }
            });
        });

        API.Frame.loadStackState();
    }

    //We check the last state returned by the webserver to see if the current frame is complete.
    this.isComplete = function () {
        //TODO: Should we really call framechain like this? It's ugly.
        try {
            return (API.FrameChain.framesStatus[API.FrameChain.currentFrame - 1] == "complete");
        }
        catch (ex) {
            return false;
        }
    }

    this.hintAudioAvailable = function (status) {
        console.log("override hintAudioAvailable with page implementation");
    }

    this.showMeVideoAvailable = function (status) {
        console.log("override showMeVideoAvailable with page implementation");
    }

    //We use this to ensure that certain calls are not made until initialization of the frame is complete.
    var preInitCallsMade = false;

    //Called when a frame is loaded.
    this.Init = function () {
        function displayEntryExitButton() {
            if (API.Frame.entryAudioFilename) {
                API.Frame.showEntryButton();
            }
            if (API.Frame.exitAudioFilename) {
                API.Frame.showExitButton();
            }
        };

        function playEntryAudio() {
            if (API.E2020.autoPlayAudio) {
                if (!Frame.callOnEntry()) {
                    Frame.playEntryAudio();
                }
                return true;
            }
            return false;
        }

        //In the future we should consider blocking api calls until init is complete, thus removing the need for the preinit logic.
        if (!preInitCallsMade) {
            preInitCallsMade = true;
            //These things should really be removed at some point
            $("#frameVideoControls").css("position", "relative").css("margin-top", "0px");
            API.parentWindow.$("#frameVideoControls").hide();
            API.parentWindow.$("#frameAudioControls").show();
        }

        if (API.FrameChain.frameUpdateInProgress) {
            setTimeout(Frame.Init, 100);
            return;
        }

        API.childWindow.$("[fdone]").each(function () {
            Frame.setDoneButtonState(this, "start");
        });

        API.Frame.hasEntryAudioPlayed = false;
        API.Frame.hasExitAudioPlayed = false;

        if (API.Frame.hintAudioFilename) {
            API.Frame.hintAudioAvailable(true);
        } else {
            API.Frame.hintAudioAvailable(false);
        }

        if (API.Frame.showMeVideoFilename) {
            API.Frame.showMeVideoAvailable(true);
        } else {
            API.Frame.showMeVideoAvailable(false);
        }

        if (Frame.isComplete())
            displayEntryExitButton()
        else {
            if (API.E2020.reviewMode) {
                if (!playEntryAudio())
                    displayEntryExitButton();
            }
            else playEntryAudio();
        }


        Frame.loadQuestions();
        Frame.proxifyWeblinks();
        if (Frame.loadFrameProgress) Frame.loadFrameProgress();

        //clear closed captioning window margins
        $("[id$='btnExit']").css("margin-top", "0px");
        $("#frameNav").css("margin-top", "0px");

        preInitCallsMade = false;
        Frame.pendingInit = false;
    }


    //Embededded Interactives API
    this.setTaskValue = function (guid, suspendedStateObj, callback) {
        if (API.Frame.completeTaskInProgress == true) { //ignore the settaskvalue call if completetask is already in progress
            if (callback) callback(false);
            return;
        }
        // save to API.Frame.StackProgress first
        // then call ajax
        this.getTask(guid, function (task) {
            if (!task || (task.Complete && task.IsRequired)) {
                if (callback) callback(false);
                return;
            }

            task.SuspendedState = suspendedStateObj;  // save data locally
            $.ajax({
                debug: true,
                url: API.E2020.addresses.frameService
                    + "FrameChain/SetTaskValueAjax/"
                    + API.E2020.learningObjectKey
                    + "/" + API.E2020.resultKey
                    + "/" + API.E2020.enrollmentKey
                    + "?taskGuid=" + guid
                    + "&fpId=" + API.FrameChain.framesProgressIds[API.FrameChain.currentFrame - 1]
                    + "&version=" + API.E2020.version,
                dataType: 'json',
                type: 'POST',
                data: { suspendedState: encodeURI(JSON.stringify(suspendedStateObj)) },
                xhrFields: {
                    withCredentials: true
                },
                success: function (data) {
                    if (callback) callback(true);
                    console.log(data);
                },
                fail: function (handler, text) {
                    if (callback) callback(false);
                    console.log(text);
                }
            });
        });


    }
    this.getTaskStatus = function (guid, callback) {
        this.getTask(guid, function (task) {
            if (!task) {
                if(callback) callback({ status: "incomplete", state: {} });
                return;
            }
            var status = (task && task.Complete) ? "complete" : "incomplete";
            if (status == "incomplete" && task.IsRequired == false) {
                API.Frame.completeTask(guid);
            }
            var state = (task && task.SuspendedState) ? JSON.parse(decodeURI(task.SuspendedState)) : {};
            if (callback) callback({ status: status, state: state });
        });
    }
    this.logError = function (err, guid, callback) {
        if (typeof (err) === "undefined")
            if (callback) callback(false);

        if (typeof (err) === "string") {
            console.log("API.Frame.logError:" + guid + ":" + err);
            if (callback) callback(true);
        }

        if (typeof (err) === "object") {
            console.log("API.Frame.logError:" + guid + ":" + JSON.stringify(err))
            if (callback) callback(true);
        }
    }
    this.getTask = function (guid, callback) {
        var self = this;
        self.loadStackProgress(function () {
            var task;
            for (var i = self.StackProgress.length - 1; i >= 0; i -= 1) {
                for (var j = self.StackProgress[i].TaskProgress.length - 1; j >= 0; j -= 1) {
                    if (self.StackProgress[i].TaskProgress[j].Guid === guid) {
                        task = self.StackProgress[i].TaskProgress[j];
                        i = j = -1; //to break out of both loops;)
                    }
                }
            }
            if (callback) callback(task);
        });
    }
    //this.CurrentFrameProgressId = "";//Introduced to store the currently loaded frameprogressId.just used to avoid multiple loading of StackProgress below
    this.loadStackProgress = function (callback) {
        var self = this;
        //var fpId = API.FrameChain.framesProgressIds[API.FrameChain.currentFrame - 1];
        //if (self.StackProgress.length > 0 && fpId == self.CurrentFrameProgressId) {
        //    //Already loaded
        //    callback();
        //}
        //else {
            $.ajax({
                url: API.E2020.addresses.frameService + "FrameChain/GetFrameProgressAjax/" + API.E2020.learningObjectKey + "/" + API.E2020.resultKey + "/" + API.E2020.enrollmentKey + "?userID=" + API.E2020.userID + "&userToken=" + API.E2020.userToken + "&fpId=" + API.FrameChain.framesProgressIds[API.FrameChain.currentFrame - 1] + "&version=" + API.E2020.version,
                dataType: 'json',
                type: 'POST',
                xhrFields: {
                    withCredentials: true
                }
            }).done(function (data) {
                self.StackProgress = data.StackProgress;
                //self.CurrentFrameProgressId = fpId;
                if (callback) callback();
            }).fail(function (jqXHR, textStatus) {
                console.log(textStatus);
            });
        //}
    }
}

//Used for most framechain level operations.
API.FrameChain = new function () {
    var FrameChain = this;
    this.currentFrame = 1;
    this.framesStatus = [];
    this.framesProgressIds = null;
    this.frameUpdateInProgress = false;

    this.renderNavigationIcons = function (values) {
        console.log("FrameChain.renderNavigationIcons(): Override with page implementation");

        /*
        for (var i = 0; i < values.length; i++) {
            if (i == currentFrame - 1) {
                if ($("#frame" + (i + 1)).length) {
                    $("#frame" + (i + 1)).attr("src", "../images/defaultskin/framechain/current.gif");
                } else {
                    $("#frameIcons").append("<img id=\"frame" + (i + 1) + "\" src=\"../images/defaultskin/framechain/current.gif\" onclick=\"API.FrameChain.openFrame(" + (i + 1) + ");\" />");
                }
            }
            else if ($("#frame" + (i + 1)).length) {
                $("#frame" + (i + 1)).attr("src", "../images/defaultskin/framechain/" + values[i] + ".gif");
            } else {
                $("#frameIcons").append("<img id=\"frame" + (i + 1) + "\" src=\"../images/defaultskin/framechain/" + values[i] + ".gif\" onclick=\"API.FrameChain.openFrame(" + (i + 1) + ");\" />");
            }
        }
        */
    }

    //Updates a state list as well as the UI.
    this.updateFramesStatus = function (values, currentFrame) {
        if (typeof (values) == "string") values = eval(values);

        //FrameChain.framesStatus = values;

        if (FrameChain.framesStatus == null) FrameChain.framesStatus = [];

        for (var i = 0; i < values.length; i++) {
            if (FrameChain.framesStatus.length <= i || FrameChain.framesStatus[i] != "complete")
                FrameChain.framesStatus[i] = values[i];
        }

        FrameChain.currentFrame = currentFrame;

        FrameChain.renderNavigationIcons(values);
    }

    this.updateFramesProgressIds = function (values) {
        if (typeof (values) == "string") values = eval(values);

        //FrameChain.framesStatus = values;

        if (FrameChain.framesProgressIds == null) FrameChain.framesProgressIds = [];

        for (var i = 0; i < values.length; i++) {
            FrameChain.framesProgressIds[i] = values[i];
        }
    }

    //Override in page containing API.
    this.openFrame = function (order) {
        console.log("Override with page implementation");
    }

    //Move to the next frame if the current frame status allows it.
    this.nextFrame = function () {
        if (FrameChain.currentFrame < FrameChain.framesStatus.length) {
            FrameChain.openFrame(FrameChain.currentFrame + 1);
        }
    }

    //Move back a frame if not at the first frame
    this.backFrame = function () {
        if (FrameChain.currentFrame > 1)
            FrameChain.openFrame(FrameChain.currentFrame - 1);
    }

    //We check the last state returned by the webserver to see if the frames are complete.
    this.isComplete = function () {
        try {
            for (var i = 0; i < FrameChain.framesStatus.length; i++) {
                if (FrameChain.framesStatus[i] != "complete") {
                    return false;
                }
            }
            return true;
        }
        catch (ex) {
            return false;
        }
    }

    //Override in page containing API.
    this.complete = function () {
        console.log("Override with page implementation");
    }
}

//A wrapper for most things question related.
API.Question = new function () {
    var Question = this;

    this.findQuestionTags = function (answerPrefix) {
        var inputList = [];

        var inputItems = API.childWindow.$("input, textarea, select");
        for (var i = 0; i < inputItems.length; i++) {
            if (inputItems[i].id.indexOf(answerPrefix) == 0) {
                inputList[inputList.length] = inputItems[i].id;
            }
        }

        return inputList;
    }

    //Used on numeric type fields to ensure that only numeric characters are entered.
    this.ensureNumeric = function (e) {
        if (window.event) { e = window.event; }

        // Standard numbers
        if (e.keyCode >= 48 && e.keyCode <= 57 && e.shiftKey == false) { return true; }

        // Keypad numbers
        if (e.keyCode >= 96 && e.keyCode <= 105 && e.shiftKey == false) { return true; }

        // % symbol
        if (e.keyCode == 53 && e.shiftKey) { return true; }

        // - sign
        if ((e.keyCode == 189 && e.shiftKey != true) || (e.keyCode == 173 && e.shiftKey != true) || e.keyCode == 109) { return true; }

        // ( - open parenthesis
        if (e.keyCode == 57 && e.shiftKey) { return true; }

        // ) - close parenthesis
        if (e.keyCode == 48 && e.shiftKey) { return true; }

        // $ - dollar sign
        if (e.keyCode == 52 && e.shiftKey) { return true; }

        // backspace key
        if (e.keyCode == 8) { return true; }

        // delete key
        if (e.keyCode == 46) { return true; }

        // tab key
        if (e.keyCode == 9) { return true; }

        // . - Period
        if ((e.keyCode == 190 && e.shiftKey == false) || e.keyCode == 110) { return true; }

        // arrow keys
        if (e.keyCode >= 37 && e.keyCode <= 40) { return true; }

        // home/end
        if (e.keyCode == 36 || e.keyCode == 35) { return true; }

        // forward slash '/'
        if (e.keyCode == 191) { return true; }

        return false;
    }

    //Called on done buttons to attempt all questions within it's respective stack.
    this.attempt = function (element) {
        Actions.Log();
        var inputList = [];

        if (!element.id) {
            element.id = API.Utilities.createUid();
        }

        var attemptNum = 0;

        if (element.className.indexOf("retry") != -1) {
            attemptNum = 1;
        }

        var container = null;

        var parent = API.childWindow.$(element).parents("[fstack]");
        if (parent.length) parent = parent[0]; else alert("Unable to find task stack");

        var stackOrder = 0;
        for (var i = 0; i < API.childWindow.$("[fstack]").length; i++) {
            if (API.childWindow.$("[fstack]")[i] == parent) {
                stackOrder = i + 1;
                break;
            }
        }

        var questionTags = API.childWindow.$(parent).find("[qid]");

        if (questionTags.length == 0) API.childWindow.$(element).hide();

        var questions = [];

        for (var i = 0; i < questionTags.length; i++) {
            questions.push(API.childWindow.$(questionTags[i]));
        }

        var outData = { fpId: API.FrameChain.framesProgressIds[API.FrameChain.currentFrame - 1], userID: API.E2020.userID, userToken: API.E2020.userToken, attemptNum: attemptNum, stackOrder: stackOrder, version: API.E2020.version };

        for (var j = 0; j < questions.length; j++) {
            var items = API.childWindow.$(questions[j]).find("input, textarea, select");

            var questionGuid = API.childWindow.$(questions[j]).attr("qid");

            for (var i = 0; i < items.length; i++) {
                inputList.push(items[i]);
            }

            for (var i = 0; i < inputList.length; i++) {
                var inputName = $(inputList[i]).attr("name");

                if ($(inputList[i]).attr("type") == "checkbox") {
                    if ($(inputList[i]).is(':checked')) {
                        outData[inputName] = "on";
                    }
                    else {
                        outData[inputName] = "off";
                    }
                }
                else if ($(inputList[i]).attr("type") == "radio") {
                    if ($(inputList[i]).is(':checked')) {
                        outData[inputName] = $(inputList[i]).attr("value");
                    }
                } else {
                    var value = $(inputList[i]).attr("value");
                    value = value.replace(/&/g, '\u0026');
                    value = value.replace(/</g, '&lt;');
                    value = value.replace(/>/g, '&gt;');                   
                    value = value.replace(/#/g, '\u0023');
                    outData[inputName] = value;
                }
            }
        }

        $.ajax({
            debug: true,
            url: API.E2020.addresses.frameService + "FrameChain/GradeAssessmentQuestionAjax/" + API.E2020.learningObjectKey + "/" + API.E2020.resultKey + "/" + API.E2020.enrollmentKey,
            data: outData,
            dataType: 'json',
            type: 'POST',
            xhrFields: {
                withCredentials: true
            },
            success: function (data) {
                var correct = true;
                for (var i = 0; i < data.questionResults.length; i++) {
                    if (!data.questionResults[i].correct) correct = false;
                    API.childWindow.$(questions[i]).html(data.questionResults[i].content);

                    API.Utilities.proxifyLinks(API.childWindow.$(questions[i]));
                }
                if (data.questionResults.length > 0) {
                    if (correct) {
                        API.Audio.playEarcon(API.E2020.addresses.commonFolder + "audio/earcon-correct.mp3");
                    } else {
                        API.Audio.playEarcon(API.E2020.addresses.commonFolder + "audio/earcon-incorrect.mp3");
                    }
                }

                if (element.className.indexOf("start") != -1) {
                    if (!correct && API.childWindow.$(element).attr("onhint")) {
                        try {
                            eval.call(API.childWindow, API.childWindow.$(element).attr("onhint"));
                        } catch (ex) {
                            console.log("An exception was thrown while attempting to play hint audio");
                        }
                    }
                }

                if (data.complete) {
                    if (API.childWindow.$(element).attr("oncomplete")) {
                        try {
                            eval.call(API.childWindow, API.childWindow.$(element).attr("oncomplete"));
                        } catch (ex) {
                            console.log("An exception was thrown while attempting to play complete audio");
                        }
                    }
                }

                if (API.E2020.frameProgressID == 0 && correct) {
                    API.Frame.setDoneButtonState(element, "complete");
                    var targetStack = API.childWindow.$("[fstack]:eq(" + (API.childWindow.$("[fstack]").index(API.childWindow.$(element).parents("[fstack]")) + 1) + ")");
                    targetStack.parents().show();
                    targetStack.show();
                } else if (data.questionResults.length > 0) {
                    API.Frame.setDoneButtonState(element, "retry");
                }

                API.Frame.loadFrameProgress();
            },
            fail: function (handler, text) {
                console.log(text);
            }
        });
    }

    this.callback = function (container, data, buttonId, done) {
        API.childWindow.$("#" + container).html(data);
        API.Frame.proxifyWeblinks();
        if (done) {
            Question.buttonDone(buttonId);
        }
    }

    //Update the done buttons state and call any event attributes it might have.
    this.buttonDone = function (buttonId) {
        var button = API.childWindow.$("#" + buttonId);
        button.css("display", "none");
        if (button.attr("completeaudio")) {
            API.Audio.playAudio(button.attr("completeaudio"));
        }
        if (button.attr("oncomplete")) {
            eval.call(API.childWindow, button.attr("oncomplete"));
        }


        var stack = API.childWindow.$(button).parents("[fstack]")[0];

        var nextStack = API.childWindow.$("[fstack]:eq(" + (API.childWindow.$("[fstack]").index(stack) + 1) + ")");
        nextStack.show();
        nextStack.parents().show();

        var complete = true;

        API.childWindow.$("[fdone]").each(function () {
            if ($(this).is(":visible"))
                complete = false;
        });

        if (complete)
            API.Frame.complete();
    }
}
