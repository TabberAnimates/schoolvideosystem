var view = namespace("contentEngine.view");
view.activity = {
    init: function () {
        AudioButton.inheritsFrom(Button);
        NextWordButton.inheritsFrom(Button);
    },
    StateEnum: {
        Disabled: {value: 0, name: "disabled"},
        Enabled: {value: 1, name: "enabled"},
        Completed: { value: 2, name: "completed" },
        Hidden: { value: 3, name: "hidden" }
    },
    Button: function (buttonToEnable)
    {
        var self = this;

        self.state = ko.observable(view.activity.StateEnum.Disabled);
        self.style = ko.computed(function()
        {
            switch (self.state()) {
                case view.activity.StateEnum.Enabled:
                    return self.enabledStyle;
                case view.activity.StateEnum.Completed:
                    return self.completedStyle;
                default:
                    return self.disabledStyle;
            }
        });
        
        self.click = function() {
            alert("do next whatever!");
        }
    },
    AudioButton: function(audioFile, buttonToEnable)
    {
        var self = this;
        view.activity.Button.call(self, buttonToEnable);

        self.enabledStyle = "vocab-play";
        self.disabledStyle = "vocab-off";
        self.completedStyle = "vocab-play";
        self.audioFile = audioFile;
        self.buttonsToComplete = new Array();
        self.isPlaying = false;

        self.setButtonsToComplete = function(buttonsToComplete)
        {
            self.buttonsToComplete = buttonsToComplete;
        }

        

        self.style = ko.computed(function () {
            switch (self.state()) {
                case view.activity.StateEnum.Enabled:
                    return self.enabledStyle;
                case view.activity.StateEnum.Completed:
                    return self.completedStyle;
                default:
                    return self.disabledStyle;
            }
        });

        self.previewClick = function () {
            Actions.Log();
            if(!self.isPlaying)
                API.Audio.playAudioEx(audioFile, function () { self.isPlaying = true; }, function () {
                    self.isPlaying = false;
                })
        }

        function WordComplete(obj) {
            //alert(viewModel.currentWord().key + "--" + viewModel.nextAvailableWord().key);
            if (buttonToEnable) {
                if (viewModel.currentWord().key == viewModel.lastWord.key) {
                    buttonToEnable.state(view.activity.StateEnum.Hidden);
                }
                else {
                    buttonToEnable.state(view.activity.StateEnum.Enabled);
                }
            }
            if (obj.buttonsToComplete) {
                for (var i = 0; i < self.buttonsToComplete.length; i++) {
                    obj.buttonsToComplete[i].state(view.activity.StateEnum.Completed);
                }
            }
            var word = viewModel.currentWord();

            if (word) {
                //mark word as complete only if audio being played is of uncompleted word
                if (audioFile == word.sentenceAudio()  || audioFile == word.definitionAudio() || ( word.sentenceAudio() == null && word.definitionAudio() == null)) {
                    if (!word.complete()) {
                        word.complete(true);

                        for (var i = 0; i < initialData.Words.length; i++) {
                            if (initialData.Words[i].Key == word.key)
                                initialData.Words[i].Complete = word.complete()

                        }
                        var queryString = "";
                        if (ActivityKeys.version) {
                            queryString = 'Vocab/UpdateAttempt?attemptKey=' + ActivityKeys.resultKey + '&completedWordKey=' + word.key + '&enrollmentKey=' + ActivityKeys.enrollmentKey + '&version=' + ActivityKeys.version;
                        } else {
                            queryString = 'Vocab/UpdateAttempt?attemptKey=' + ActivityKeys.resultKey + '&completedWordKey=' + word.key + '&enrollmentKey=' + ActivityKeys.enrollmentKey;
                        }
                        $.ajax({
                            url: API.E2020.addresses.ContentEngineViewersPath + queryString,
                            type: "POST",
                            contentType: "application/json; charset=utf-8",
                            success: function (result) {
                                viewModel.currentWord().complete(true);

                                if (ko.utils.arrayFirst(viewModel.words(), function (item) {
                                    return !item.complete()
                                }) != null) {
                                    viewModel.nextAvailableWord(ko.utils.arrayFirst(viewModel.words(), function (item) {
                                        return !item.complete()
                                    }))
                                }


                                if (viewModel.complete() || result.complete) {
                                    initialData.Complete = true;
                                    if (buttonToEnable) {
                                        buttonToEnable.state(view.activity.StateEnum.Hidden);
                                    }

                                    window.location.href = API.E2020.addresses.ContentEngineViewersPath + 'LTILogin/Complete?enrollmentKey=' + ActivityKeys.enrollmentKey;
                                }
                            }
                        });
                    }
                }



            }
        }
        self.click = function () {
            Actions.Log();
            //call audio service and enable the next button
            if (self.state() != view.activity.StateEnum.Disabled) {
                var word = viewModel.currentWord();
                if (word) {
                    if (word.sentenceAudio() == null && word.definitionAudio() == null) {
                        WordComplete(self);
                    }
                    else {
                        setTimeout(function () { WordComplete(self); }, 7000);
                        if (!self.isPlaying)

                            API.Audio.playAudioEx(audioFile, function () { self.isPlaying = true; }, function () {

                                self.isPlaying = false;
                                WordComplete(self);

                            })
                    }
                }
               

            }
        }
    },
    NextWordButton: function () {
        var self = this;
        view.activity.Button.call(self);

        self.visible = ko.observable(true);

        self.enabledStyle = "uibtn uibtn-blue uibtn-arrow-next";
        self.disabledStyle = "uibtn uibtn-blue uibtn-arrow-next disabled";
        self.hiddenStyle = "uibtn uibtn-blue uibtn-arrow-next hidden";

        self.buttonsToDisable = new Array();

        self.setButtonsToDisable = function (buttonsToDisable) {
            self.buttonsToDisable = buttonsToDisable;
        }

        self.style = ko.computed(function () {
            switch (self.state()) {
                case view.activity.StateEnum.Enabled:
                    return self.enabledStyle;
                case view.activity.StateEnum.Hidden:
                    return self.hiddenStyle;
                case view.activity.StateEnum.Completed:
                    return self.completedStyle;
                default:
                    return self.disabledStyle;
            }
        });

        self.click = function () {
            Actions.Log();
            if (self.state() == view.activity.StateEnum.Enabled) {
                if (self.buttonsToDisable) {
                    for (var i = 0; i < self.buttonsToDisable.length; i++) {
                        self.buttonsToDisable[i].state(view.activity.StateEnum.Disabled);
                    }
                }

                self.state(view.activity.StateEnum.Disabled);
                viewModel.nextWord();
            }
        }
    }
};
