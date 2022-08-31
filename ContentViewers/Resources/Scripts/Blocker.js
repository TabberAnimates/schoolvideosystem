// JScript File
function DisplayLoading()
{
    if(glblCurrentlyInPostback)
    {
        var submitLoading = document.getElementById("submitLoading");
        if (submitLoading) submitLoading.style.display = "block";
    }
}

function HideLoading()
{
    if(!glblCurrentlyInPostback)
    {
        var submitLoading = document.getElementById("submitLoading");
        if(submitLoading) submitLoading.style.display = "none";
    }
}

function HideBlocker()
{
    var submitBlocker = document.getElementById("submitBlocker");
    if (submitBlocker) submitBlocker.style.display = "none";
    setTimeout("HideLoading()", 1);
}

function DisplayBlocker()
{
    var submitBlocker = document.getElementById("submitBlocker");
    if (submitBlocker) submitBlocker.style.display = "block";
    setTimeout("DisplayLoading()", 1);
}

var functionsToCall = [];


var glblPostbackTimeoutTimer;
var glblCurrentlyInPostback = false;
function BeginBlockerRequest(continueWith, disableTimeout)
{
    if (!continueWith || typeof continueWith != "function") {
        continueWith = function () { };
    }
    if (!glblCurrentlyInPostback) {
        setTimeout(function () { continueWith(); }, 1);
        glblCurrentlyInPostback = true;
    }
    else {
        functionsToCall.push(continueWith);
    }
    clearTimeout(glblPostbackTimeoutTimer);
    if (disableTimeout !== true)
        glblPostbackTimeoutTimer = setTimeout("HideBlocker()", 10000);   
    DisplayBlocker();
}

function EndBlockerRequest() 
{
    if (glblCurrentlyInPostback) {
        if (functionsToCall.length == 0) {
            glblCurrentlyInPostback = false;
            HideBlocker();
            if (glblPostbackTimeoutTimer) clearTimeout(glblPostbackTimeoutTimer);
        }
        else {
            functionsToCall.shift(0)();
        }
    }
}
