$.support.cors = true;

var API = new function () {
    var API = this;
    //Private members
    var lastError = 0;
    var errors = { 0: "no error" };

    var store =
    {
        "cmi":
          {
              "core":
                {
                    "student_id": 12345,
                    "student_name": "Last, First",
                    "lesson_status": "not attempted",
                    "lesson_mode": "review",
                    "exit": "",
                    "lesson_location": ""
                }
          }
    };

    /*
    Return: String value representing success boolean value: "true" or "false".
    */
    this.LMSInitialize = function () {
        lastError = 0;
        return "true";
    }

    /*
    Return: String value representing success boolean value: "true" or "false".
    */
    this.LMSFinish = function () {
        lastError = 0;
        return "true";
    }

    /*
    Return: Always a string
    Must support datamodel, but not sure yet on the definition.
    */
    this.LMSGetValue = function (element) {
        var indexes = element.split(".");
        var item = store;
        for (var i = 0; i < indexes.length; i++) {
            if (!(indexes[i] in item)) {
                //lastError = xxx;
                return "";
            }
            item = item[indexes[i]];
        }
        lastError = 0;
        return item;
    }

    /*
    What is the return value for?
    */
    this.LMSSetValue = function (element, value) {
        store[element] = value;
        lastError = 0;
        return "";
    }

    /*
    Return: String value representing success boolean value: "true" or "false".
    */
    this.LMSCommit = function () {
        lastError = 0;
        return "true";
    }

    /*
        
    */
    this.LMSGetLastError = function () {
        return lastError;
    }

    /*
        
    */
    this.LMSGetErrorString = function (errorCode) {
        return "";
    }

    /*
        
    */
    this.LMSGetDiagnostic = function (errorCode) {
        return "";
    }

    this.parentWindow = window;
    this.childWindow = null; // This is set in the API connector

    //Public Domain: http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
    this.isElement = function () {
        try {
            //Using W3 DOM2 (works for FF, Opera and Chrom)
            return obj instanceof HTMLElement;
        }
        catch (e) {
            //Browsers not supporting W3 DOM2 don't have HTMLElement and
            //an exception is thrown and we end up here. Testing some
            //properties that all elements have. (works on IE7)
            return (typeof obj === "object") &&
              (obj.nodeType === 1) && (typeof obj.style === "object") &&
              (typeof obj.ownerDocument === "object");
        }
    }

    //This is used to keep a running list of guid to function references for callbacks from flash.
    this.Callback = new function () {
        var Callback = this;

        this.destroy = function () {
            for (var item in Callback) {
                if (item != "destroy"
                && item != "createCallback"
                && item != "createGuid"
                && item != "callFunction") {
                    Callback[item] = null;
                }
            }
        }

        this.createCallback = function (func) {
            var guid = "Callback_" + Callback.createGuid();
            Callback[guid] = func;
            return guid;
        }

        //Public domain: http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
        this.createGuid = function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        this.callFunction = function (functionName) {
            Callback[functionName].apply(null, Array.prototype.slice.call(arguments).slice(1));
        }
    }

    //This class is responsible for replacing the contents of a dom element with the contents of a caption file.
    this.Caption = function (captionFileName, elementID) {
        var Caption = this;

        this.captionFileName = captionFileName;
        this.elementID = elementID;
        this.captions = [];
        this.currentCaption = null;

        //We call this periodically to update what's being displayed
        this.writeCaption = function (seconds, elementID, captions) {
            if (seconds == null) throw "No seconds specified.";
            var elementID = elementID || Caption.elementID || new function () { throw "No elementID specified."; };
            var captions = captions || Caption.captions || new function () { throw "No captions available."; };
            var currentCaption = Caption.currentCaption;

            var captionBeforeTime = null;
            for (var i = 0; i < captions.length; ++i) {
                if (captions[i].startTime <= seconds) {
                    captionBeforeTime = captions[i];
                } else {
                    break; // Since these are sorted, the first one that is after the current time means we can exit the loop
                }
            }
            if (captionBeforeTime) {
                if (captionBeforeTime != currentCaption) {
                    if (currentCaption) {
                        //elementID.fadeOut(200);
                        setTimeout(function () { $("#" + elementID).html(captionBeforeTime.text); }, 200);
                    } else {
                        $("#" + elementID).html(captionBeforeTime.text);
                    }
                    $("#" + elementID).fadeIn(200);
                }
            }

            Caption.currentCaption = captionBeforeTime;
        };

        //Pull the file from a generic handler page. We do this instead of pulling from static files, as it's easier to handle the files in a database and avoid cross-domain issues.
        this.getCaptionsXml = function () {

            var data = { };

            try {
                data.frameIndex = API.FrameChain.currentFrame - 1;
            } catch (ex) {
                console.log("Unable to find current frame index");
            }

            try {
                if (API.E2020.learningObjectKey === "undefined")
                    throw "LearningObjectKey Undefined";
                data.learningObjectKey = API.E2020.learningObjectKey;
            } catch (ex) {
                console.log("Unable to find current learningObjectKey");
                return;
            }

            API.parentWindow.jQuery.ajax({
                dataType: "text",
                type: "POST",
                data: data,
                url: API.E2020.addresses.frameService + "FrameChain/GetVideoCaptions/" + API.E2020.learningObjectKey,
                success: function (result) {
                    var xmlDoc = jQuery.parseXML(result);
                    jQuery(xmlDoc).find("p").each(function () {
                        var startTime = jQuery(this).attr("begin");
                        var getInnerXml = function (node) {
                            // http://www.webmasterworld.com/javascript/3857744.htm
                            return (node.xml || (new XMLSerializer()).serializeToString(node) || "").replace(new RegExp("(^<\\w*" + node.tagName + "[^>]*>)|(<\\w*\\/\\w*" + node.tagName + "[^>]*>$)", "gi"), "");
                        };
                        var text = jQuery.trim(getInnerXml(jQuery(this)[0]));
                        var splitTime = startTime.split(":");
                        startTime = parseFloat((splitTime[0] * 60 * 60)) + parseFloat((splitTime[1] * 60)) + parseFloat(splitTime[2]);


                        Caption.captions.push({ startTime: parseFloat(startTime), text: text });
                    });
                    var sortFunction = function (a, b) { return a.startTime - b.startTime };
                    Caption.captions.sort(sortFunction);
                    if (Caption.captions && Caption.captions.length) {
                        jQuery("div.ClosedCaption").show();
                    } else {
                        jQuery("div.ClosedCaption").hide();
                    }
                },
                error: function () {
                    console.log("Error retrieving captions");
                }
            });
        };

        Caption.getCaptionsXml();
    }

    //Helpful functions that didn't fit in elsewhere.
    this.Utilities = new function () {
        var Utilities = this;
        this.UidPrefix = "uid";
        this.UidCounter = 1;

        this.createUid = function () {
            return Utilities.UidPrefix + Utilities.UidCounter++;
        }

        this.Url = function (address) {
            this.url = address.match(/(http|ftp):\/\/([a-z0-9\.]+)([\/a-z0-9\.]+)?(\?[^#]*)?(#.)?/i);
            this.protocol = address[1];
            this.host = address[2];
            this.path = address[3];
            this.query = address[4];
            this.hash = address[5];
        }

        this.loadProxyWindow = function (address) {
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

        this.proxifyLinks = function ($element) {
            $element.find("a").each(function () {
                //Do not proxify a tags that contain label links or javascript in their href attribute.
                if (!this.href.toLowerCase().match(/javascript:|^#/)) {
                    this.target = "_blank";
                    $(this).click(function () {
                        Utilities.loadProxyWindow(this.href);
                        Actions.Log();
                        return false;
                    });
                }
            });
        }

        this.cleanLinks = function ($element) {
            $element.find("a").each(function () {
                //Do not proxify a tags that contain label links or javascript in their href attribute.
                if (this.href.toLowerCase().indexOf('javascript:') == -1
                    && this.href.toLowerCase().indexOf('#') == -1) {
                    this.target = "_blank";
                    return true;
                }
            });
        }
    }

    //Used to store most LMS specific variables that might be needed.
    this.E2020 = new function () {
        API.parentWindow = window;
        API.childWindow = window;

        this.userID = 0;
        this.userToken = "unset";
        this.frameProgressID = 0;
        this.autoPlayAudio = true;
        this.loggedIn = false;
        this.version = "0";
        this.key = "unset";
        this.addresses = new function () {
            this.frameService = "http://sandbox.education2020.com/asvc/";
            this.videoFolder = "http://sandbox.education2020.com/media/";
            this.commonFolder = "http://sandbox.education2020.com/frames/common/";
            this.frameProxyLinks = "";
        }

        //Used to validate that the calling user is in fact a valid user and setup a session.
        this.login = function () {
            $.ajax({
                debug: true,
                url: API.E2020.addresses.frameService + "Login/Login?SSO=" + API.E2020.SSO,
                dataType: 'json',
                type: 'POST',
                xhrFields: {
                    withCredentials: true
                },
                success: function (data) {
                    console.log(data);
                    API.E2020.loggedIn = true;
                },
                fail: function (handler, text) {
                    console.log(text);
                }
            });
        }
    }
}
