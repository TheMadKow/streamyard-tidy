'use strict';

// ==UserScript==
// @name         StreamYard Tidy
// @namespace    http://tampermonkey.net/
// @version      0.253.00000
// @description  try to take over the world!
// @updateURL    https://quiz.zenidge.net/LiveScripts/StreamYardTidy.user.js
// @downloadURL  https://quiz.zenidge.net/LiveScripts/StreamYardTidy.user.js
// @author       Critical Cripple
// @match        https://streamyard.com/*
// @grant        none
// ==/UserScript==

/*******************  
   CONSTS
*******************/

const DEFAULT_GAP = 3;
const CELL_STYLE = 'border: 1px solid black;';

/*******************  
   SINGELTONS
*******************/

let tidySettings = {
    debugMode: true,
    isOn = false,
    layout: {
        makeBackroomOnTop: true,
        makeBackroomBottom: true,
        autoAddHost: false,
        autoAdd: false,
        enabledArrowKeys: true,
    },
    grid: {
        backgroundColour: '#FF0000',
        baseHeight: 135,
        baseWidth: 233,
        sizeAdjust: 1.00,
        rows: 2,
        cols: 3,
        gapWidthBetween: 3,
        gapHeightBetween: 3,
    },
    cell: {
        guestNameTextSize: 20,
        guestNameHeight: 30, // text size + 10
        backgroundColourName: '#00FF00',
        foregroundColourName: '#000000',
        emptyCellImage: 'https://i.imgur.com/h4cjsdX.png',
    },
    startup: {
        startUp_IfHost_EnableView: true,
        startUp_IfHost_ShowTidyWindow: true,
        startUp_IfGuest_EnableView: false,
        startUp_IfGuest_ShowTidyWindow: false,
    },
    // TBD
    makeControlsOnTop: true,
    newSettingsSystemEnable: true,
    muteEveryone: false,
    remoteControlWebService: true,
    remoteControlChat: true,
    force_RemainFullScreen: false,
    forceFullScreen: false
}

const tidyState = {
    grid: {
        height = Math.round(tidySettings.grid.baseHeight * settings.grid.sizeAdjust),
        width = Math.round(tidySettings.grid.baseWidth * tidySettings.grid.sizeAdjust),
    },
    outerDiv: undefined,
    emptySlots: [],
    buttonDivs: []
}

const original = {
    textFontSize: '',
    textPadding: '',
    textColor: '',
    textHeight: '',
    micHeight: '',
    micWidth: '',
    micFill: '',
}


/*******************  
   UNMAPPED VARS
*******************/

var sVersion = '0.253.00000';
var WS_ON = true;
var DEBUG_LOG_OBSERVER_ADD_REMOVE_ETC = false;
var checkWSInterval;
var sRemoteWSPerm = {};
var sRemoteChatPerm = '';
var LAST_SOLO_LAYOUT_BUTTON;
var RemotelyLogConnectDisconnectMessage = true;
var googleTagLengthChecked = 0;
var checkingGoogleTags = false;
var googleTagInterval;
var iInfoGap = 35;
var doConnectToOBS = false;
var backgroundType = 'img';
var tidyExternalWindow;
var chatWindow;
var openedChatWindow = false;
var tidySettingsWindow;
var tidySettingsWindowOpen = false;
var iDoneX = 0;
var bIsHost = false;
var hostName = '';
var sssK = '';
var clientID = '';
var setupKeyUp = false;
var State = "UNKNOWN";
var cells = [];
var gotWrap = false;
var tagsWrap;
var lookingForWrap = false;
var rowChatColour = 1;
var rowChatColour1 = '#c9ffd0'
var rowChatColour2 = '#d7bdff';
var rowChatColourMe = '#ffba4a';
var dave_chatTextBox;
var chatTextArea, chatSubmitBtn;


/*******************  
   HELPER FUNCTIONS
*******************/

function getPosition(row, col) {
    return `${row}|${col}`;
}

function selectWindow(v) {
    const rowCol = v.split("|");
    selectedRow = 1 * rowCol[0];
    selectedCol = 1 * rowCol[1];

    if (chatWindow) {
        const extSelect = chatWindow.document.getElementById("selectRowCol");
        if (extSelect.value != v) extSelect.value = v;

        const sName = document.getElementById('StreamerName-R' + selectedRow + '-C' + selectedCol).textContent;
        chatWindow.document.getElementById("rowColSelectDescription").innerHTML = sName;

        const dltbl = chatWindow.document.getElementById("duplicatedLayoutTbl");
        let oRow, oCol
        for (let iRow = 0; iRow < rows; iRow++) {
            oRow = dltbl.rows[iRow];
            for (var iCol = 0; iCol < cols; iCol++) {
                oCol = oRow.cells[iCol];
                if (iRow == selectedRow && iCol == selectedCol) {
                    oCol.style.backgroundColor = '#ff6d57';
                } else {
                    oCol.style.backgroundColor = '#ffffff';
                }
            }
        }
    }

}


/*******************  
   SETTINGS SAVE LOAD
*******************/

function saveSettings(settings) {
    localStorage.setItem("tidy-settings", JSON.stringify(settings));
}

function loadSettings() {
    const savedSettings = localStorage.getItem('tidy-settings');
    if (savedSettings) {
        return JSON.parse(savedSettings)
    }

    return {}
}


/*******************  
   SETUP OBSERVER
*******************/

// TODO Callback hasn't been refactored yet
const observer = new MutationObserver(callback);
const config = { attributes: true, childList: true, subtree: true };



/*******************  
   LOAD AND UNLOAD
*******************/

function loadTidy() {
    console.info("Tidy: Initializing");

    // Create an observer instance linked to the callback function
    observer.observe(document.body, config);

    settings = { ...settings, ...loadSettings() };

    tidyState.grid.height = Math.round(baseHeight * settings.sizeAdjust);
    tidyState.grid.width = Math.round(baseWidth * settings.sizeAdjust);

    setupOuterDiv()

    window.addEventListener("unload", unloadTidy);
    console.info("Tidy: Initialized");
}

function setupOuterDiv() {
    if (!tidyState.outerDiv) {
        createOuterDiv();
    }

    const { cols, rows, gapWidthBetween, gapHeightBetween } = tidySettings.grid;
    const { guestNameHeight } = tidySettings.cell;
    const cellHeight = tidyState.grid.height;
    const cellWidth = tidyState.grid.width;

    tidyState.outerDiv.style.width =
        ((cols * (tidyState.grid.width + gapWidthBetween) + DEFAULT_GAP + DEFAULT_GAP - gapWidthBetween)) + 'px';

    tidyState.outerDiv.style.height =
        (((rows) * (tidyState.grid.height + gapHeightBetween + guestNameHeight)) + DEFAULT_GAP - settings.gapHeightBetween) + 'px';

    const slots = rows * cols;
    tidyState.emptySlots = Array(slots).fill({})
    tidyState.buttonDivs = Array(slots).fill({})

    let currentLeft, currentTop = cellHeight + DEFAULT_GAP + DEFAULT_GAP;
    let streamNo = 0;

    for (let row = 0; row < rows; row++) {
        currentLeft = DEFAULT_GAP;
        for (let col = 0; col < cols; col++) {
            const imageLeft = DEFAULT_GAP + (col * (cellWidth + gapWidthBetween));
            const imageTop = DEFAULT_GAP + (row * (cellHeight + DEFAULT_GAP + guestNameHeight + gapHeightBetween));

            tidyState.emptySlots[streamNo].src = tidySettings.cell.emptyCellImage;
            tidyState.emptySlots[streamNo].setAttribute('style', 'position: fixed; color:black; z-index: 1; top: ' + imageTop + 'px; left: ' + imageLeft + 'px; width: ' + cellWidth + 'px; height: ' + cellHeight + 'px;  background-color: green;' + CELL_STYLE);

            const position = getPosition(row, col);

            tidyState.emptySlots[streamNo].setAttribute('currentpos', position);
            tidyState.emptySlots[streamNo].addEventListener("click", () => { emptyImageClick(this); }, false);
            tidyState.emptySlots[streamNo].setAttribute('style', 'visibility:hidden;')

            settings.buttonDivs[streamNo].setAttribute('row', row)
            settings.buttonDivs[streamNo].setAttribute('col', col)
            settings.buttonDivs[streamNo].setAttribute('style', 'position: fixed; visibility:hidden; color:black; z-index: 2; padding:2px; top: ' + currentTop + 'px; left: ' + currentLeft + 'px; width: ' + cellWidth + 'px; height: ' + guestNameHeight + 'px;  background-color: green; border: 1px solid black;');
            settings.buttonDivs[streamNo].id = `StreamerName-R${row}-C${col}`;

            currentLeft = currentLeft + cellWidth + DEFAULT_GAP;
            streamNo = streamNo + 1;
        }
        currentTop = currentTop + DEFAULT_GAP + nameHeight + cellHeight + DEFAULT_GAP;
    }
}

function unloadTidy() {
    try {
        if (openedChatWindow) {
            if (chatWindow) {
                chatWindow.document.title = chatWindow.document.title + ' [DISCONNECTED]';

            }
        }

        if (tidySettings.isOn) {
            turnScriptOff();
        }
    } catch (e) {
        console.error(e)
    }
}

/*******************  
   TURN ON SCRIPT
*******************/

function turnScriptOn() {
    console.log('Tidy: Script turned on');
    tidySettings.isOn = !tidySettings.isOn;

    document.title = 'StreamYard-ForOBS';
    outerDiv.style.display = 'block';
    outerDiv.style.visibility = 'visible';

    GrabVideos();
    resizeExisting();
    SetAllCardRowWrapSettings();

    if (tagsWrap) {
        tagsWrap.style.visibility = 'hidden';
    }

    if (!setupKeyUp) {
        document.addEventListener('keyup', handleKeyUp);
    }
}


function GrabVideos() {
    const elements = document.querySelectorAll('div');

    for (let i = 0; i < elements.length; i++) {
        const elClass = elements[i].className;

        if (elClass.startsWith("Stream__Wrap")) {
            initFoundStream(elements[i])
        } else if (elClass.indexOf('Video__Wrap') != -1) {
            elements[i].setAttribute('style', 'z-index:auto;');
            const subElements = elements[i].querySelectorAll('img');
            for (let j = 0; j < subElements.length; j++) {
                if (subElements[j].className.startsWith("OverlayImage__StyledImage")) {
                    subElements[j].setAttribute('style', 'visibility:hidden;');
                }
            }

        } else if (elClass.startsWith("GhostWrapper")) {
            elements[i].style.display = 'none';
            elements[i].style.visibility = 'hidden';
        }
    }
}

function initFoundStream(e) {
    if (settings.debugMode) {
        console.log('Tidy: initFoundStream original stream')
    }

    var streamerName = getStreamerName(e);
    if (streamerName == '') {
        // This is a shared screen
        // This is now somewhat bugged
    }

    e.setAttribute('origstyle', e.getAttribute('style'));
    e.addEventListener("click", () => { onStreamClick(this); }, false);

    const position = findPlaceForStream(streamerName, false);
    if (position.found) {
        if (position.moveExisting) {
            const existingElement = getCurrentElementInPlace(getPosition(position.row, position.col));
            const existingStreamerName = getStreamerName(existingElement)
            const positionExisting = findPlaceForStream(existingStreamerName, true);

            if (positionExisting.found) {
                setStreamPosition(existingElement, positionExisting.row, positionExisting.col, existingStreamerName);
            } else {
                alert('Can\'t find a position for the existing streamer...');
            }
        }

        setStreamPosition(e, position.row, position.col, streamerName);
        selectWindow(getPosition(position.row, position.col));
    } else {
        alert('Can\'t find a position for this streamer...');
    }
}


function onStreamClick(e) {
    if (settings.debugMode) {
        console.log(`stream clicked: ${e} `);
    }
    selectWindow(e.getAttribute('currentpos'));
}


function getStreamerName(e) {
    let streamerName = '';
    let paragraphs = e.querySelectorAll('P');
    for (var i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].className.indexOf("__NameText") != -1) {
            streamerName = paragraphs[i].textContent;
            i = paragraphs.length;
        }

    }
    return streamerName;
}


// TODO Maybe refactor this later
function findPlaceForStream(streamerName, onlyEmpty) {
    var r = {
        found: false,
        row: -1,
        col: -1,
        moveExisting: false
    }
    var iRow, iCol, position;
    var eOld;
    var tmpName;
    // Let's see if there is already a spot for this person
    for (iRow = 0; iRow < rows; iRow++) {
        for (iCol = 0; iCol < cols; iCol++) {
            tmpName = it('StreamerName-R' + iRow + '-C' + iCol);
            if (tmpName == streamerName) {
                position = iRow + "|" + iCol;
                eOld = getCurrentElementInPlace(position)
                if (eOld) {
                    if (!onlyEmpty) {
                        r.found = true; r.row = iRow; r.col = iCol; r.moveExisting = true;
                        iRow = rows; iCol = cols;
                    }
                } else {
                    r.found = true; r.row = iRow; r.col = iCol;
                    iRow = rows; iCol = cols;
                }
            }
        }
    }

    if (!r.found) {
        // let's see if there is an empty slot
        for (iRow = 0; iRow < rows; iRow++) {
            for (iCol = 0; iCol < cols; iCol++) {
                tmpName = it('StreamerName-R' + iRow + '-C' + iCol);
                if (tmpName == '') {
                    r.found = true; r.row = iRow; r.col = iCol;
                    iRow = rows; iCol = cols;
                }
            }
        }
    }

    if (!r.found) {
        // ok, check if there is any slot not in use.
        for (iRow = 0; iRow < rows; iRow++) {
            for (iCol = 0; iCol < cols; iCol++) {
                //if (ih('StreamerName-R' + iRow + '-C' + iCol) == '') {
                position = iRow + "|" + iCol;
                eOld = getCurrentElementInPlace(position)
                if (!eOld) {
                    r.found = true; r.row = iRow; r.col = iCol;
                    iRow = rows; iCol = cols;
                }
                //}
            }
        }
    }

    return r;
}

function ih(n) {
    try { return document.getElementById(n).innerHTML; } catch (e) { return 'error getting innerHTML'; }
}

function it(n) {
    try { return document.getElementById(n).textContent; } catch (e) { return 'error getting textContent'; }
}

function getCurrentElementInPlace(findPos) {
    const elements = document.querySelectorAll('div');
    for (let i = 0; i < elements.length; i++) {
        if (elements[i].className.startsWith("Stream__Wrap")) {
            try {
                const chkPos = elements[i].getAttribute('currentpos');
                if (chkPos == findPos) {
                    return elements[i];
                }
            } catch (e) {
            }
        }

    }
    return false;
}


function setStreamPosition(elm, row, col, streamerName) {

    const { gapWidthBetween, gapHeightBetween, nameHeight, } = tidySettings.cell;
    const { width, height } = tidyState.grid;

    const currentLeft = DEFAULT_GAP + (col * (width + gapWidthBetween));
    const currentTop = DEFAULT_GAP + (row * (height + DEFAULT_GAP + nameHeight + gapHeightBetween));

    const position = getPosition(row, col);

    elm.setAttribute('currentpos', position);
    elm.setAttribute('style', 'position: fixed; opacity: 1; z-index:1299;  top:' + currentTop + 'px; left:' + currentLeft + 'px; width:' + width + 'px; height:' + height + 'px;');

    var txt = document.getElementById('StreamerName-R' + row + '-C' + col);
    txt.innerHTML = streamerName;

    setStreamPropopertiesWeLike(elm);
}




function resizeExisting() {
    // assuming new sizes have been set.

    outerDiv.style.width = ((cols * (iWidth + gapWidthBetween) + DEFAULT_GAP)) + 'px';
    outerDiv.style.height = (((rows) * (iHeight + DEFAULT_GAP + DEFAULT_GAP + nameHeight)) + DEFAULT_GAP) + 'px';

    var elements = document.querySelectorAll('div');
    var i, elLength;

    var foundStreams = [];
    var foundNo = 0;
    var elClass = '';
    for (i = 0, elLength = elements.length; i < elLength; i++) {
        elClass = elements[i].className;
        if (elClass.startsWith("Stream__Wrap")) {
            try {
                var rowCol = elements[i].getAttribute('currentpos').split("|");
                var iRow = parseInt(rowCol[0]);
                var iCol = parseInt(rowCol[1]);
                setStreamPosition(elements[i], iRow, iCol, document.getElementById('StreamerName-R' + iRow + '-C' + iCol).textContent);
            } catch (e) {
            }
        }

    }



}

/*******************  
   TURN OFF SCRIPT
*******************/


function turnScriptOff() {
    console.log('Tidy: Script turned off');
    tidySettings.isOn = !tidySettings.isOn;

    outerDiv.style.display = 'none';
    outerDiv.style.visibility = 'hidden';

    const elements = document.querySelectorAll('div');
    const elLength = elements.length;

    for (let i = 0; i < elLength; i++) {
        const elClass = elements[i].className;
        if (elClass.startsWith("Stream__Wrap")) {
            elements[i].setAttribute('style', elements[i].getAttribute('origstyle'));
        }

    }

    tagsWrap.style.visibility = 'visible';
    resetOrigStyles();
}


function resetOrigStyles() {
    let elements = document.querySelectorAll('svg');

    for (let i = 0; i < elements.length; i++) {
        if (((elements[i].className) + '').startsWith("[object SVGAnimatedString]")) {
            if (elements[i].className.baseVal.indexOf('__NameMic') != -1) {
                resetOrigStyle(elements[i]);
                elements[i].style.width = OrigMicWidth;
                elements[i].style.height = OrigMicHeight;
                elements[i].style.fill = OrigMicFill;
            }
        }
    }

    elements = document.querySelectorAll('div');
    for (i = 0; i < elements.length; i++) {
        if (((elements[i].className) + '').indexOf("__NameWrap") != -1) {
            resetOrigStyle(elements[i]);
        }
    }

    elements = document.querySelectorAll('p');
    for (i = 0; i < elements.length; i++) {
        if (((elements[i].className) + '').indexOf("__NameText") != -1) {
            resetOrigStyle(elements[i]);
            elements[i].style.color = original.textColor;
            elements[i].style.height = original.textHeight;
            elements[i].style.fontSize = original.textFontSize;
            elements[i].style.padding = original.textPadding;;
        }
    }

    SetAllCardRowWrapSettings();
}

function resetOrigStyle(e) {
    try {
        var originStyle = e.getAttribute('origstyle');
        if (originStyle) {
            e.setAttribute('style', originStyle);
        }
    } catch (e) { }
}


function SetAllCardRowWrapSettings() {
    var elements = document.querySelectorAll('div');

    for (let i = 0; i < elements.length; i++) {
        const elClass = elements[i].className;
        if (elClass.startsWith("CardRow__Row") || elClass.startsWith("CardRow__Wrap") || elClass.startsWith("Studio__CardRowWrap")) {
            SetCardRowWrapSettings(elements[i]);
        }
    }
}

function SetCardRowWrapSettings(e) {
    let zIndex = null, marginBottom = null, marginTop = null;
    if (tidySettings.isOn) {
        // add gubbins
        if (bMakeBackroomOnTop) {
            zIndex = '9005';
        }
        if (bMakeBackroomBottom) {
            marginBottom = '0px';
            marginTop = 'auto';
        }
    }

    e.style.zIndex = zIndex;
    e.style.marginBottom = marginBottom;
    e.style.marginTop = marginTop;
}


/* IFEE EXECUTE SCRIPT */
(function () {
    if (settings.debugMode) {
        console.warn('Tidy: Running in debug mode!');
    }
    setTimeout(loadTidy, 3000);
})();



/* REFACTORED TO HERE */

function clickDaveChatSubmit() {
    //    chatTextArea.value = dave_chatTextBox.value;
    //chatTextArea.checkValidity();
    //chatSubmitBtn.click();

    sendMessageOurSelf(dave_chatTextBox.value);
    dave_chatTextBox.value = '';


}


var chatDiv;

var sHangoutTitle = '';

var bProcessingFlip = false;
var bDoingTimedFlipp = false;

var lastScreenFliip = -1;

function doGoRandomScrenFlip() {
    if (bDoingTimedFlipp) {
        if (!bProcessingFlip) {
            bProcessingFlip = true;
            var elements = document.querySelectorAll('path');
            var elClass = '';
            var tmpEle;
            var screens = [];
            var i, elLength;
            for (i = 0, elLength = elements.length; i < elLength; i++) {
                if (elements[i].getAttribute('d') == 'M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z') {
                    screens.push(elements[i]);
                }

                /*if (elements[i].className.indexOf('ButtonBase__WrapperButton') != -1) {
                    var sTmp = elements[i].ariaLabel;
                    if (sTmp == 'Fullscreen layout') {
                        screens.push(elements[i]);
                       // got 1
                    }
                }
                */
            }

            if (screens.length > 0) {
                var randomNo = getRandomInt(0, screens.length);
                if (randomNo == lastScreenFliip) { randomNo = getRandomInt(0, screens.length); }
                if (randomNo == lastScreenFliip) { randomNo = getRandomInt(0, screens.length); }
                if (randomNo == lastScreenFliip) { randomNo = getRandomInt(0, screens.length); }
                if (randomNo == lastScreenFliip) { randomNo = getRandomInt(0, screens.length); }
                lastScreenFliip = randomNo;
                tmpEle = screens[randomNo];
                try {
                    elements = tmpEle.parentNode.parentNode.parentNode.querySelectorAll('button');
                    for (i = 0, elLength = elements.length; i < elLength; i++) {
                        if (elements[i].ariaLabel == 'Add to stream') {
                            elements[i].click();
                            console.log('Flip...');
                        }
                    }


                } catch (e) {
                    console.log('Failed flip...');
                }
            }
            //ButtonBase__WrapperButton



            setTimeout(doGoRandomScrenFlip, 10000);
            bProcessingFlip = false;
        }
    }

}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatAMPM(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
}

var divCardWrap;

function getInitialNamesFromWrap() {
    if (divCardWrap) {
        var elements = divCardWrap.querySelectorAll('span');
        var elClass = '';
        for (var i = 0, elLength = elements.length; i < elLength; i++) {
            elClass = elements[i].className;
            if (elClass.startsWith("styled__ClientInfoText") || (elClass.indexOf('CardName__StyledText') != -1)) {
                addSystemMessageToChatWindow('[Initial]', "'" + elements[i].textContent + "' Connected.");
            }
        }
    }
}

function getNamesFromBackRoom() {
    var sRes = '';
    if (divCardWrap) {
        var iCount = 0;
        var elements = divCardWrap.querySelectorAll('span');
        var elClass = '';
        var streamNo;
        for (var i = 0, elLength = elements.length; i < elLength; i++) {
            elClass = elements[i].className;
            if (elClass.startsWith("styled__ClientInfoText") || (elClass.indexOf('CardName__StyledText') != -1)) {
                iCount++;
                sRes = sRes + iCount + '|#|' + elements[i].textContent + '||##|';
            }
        }
    }
    return sRes;
}



function FindCardWrapForPerson(sName) {
    var elements = document.querySelectorAll('span');
    var elClass = '';
    var tmpEle;
    for (var i = 0, elLength = elements.length; i < elLength; i++) {
        if (elements[i].className.indexOf('CardName__StyledText') != -1) {
            var sTmp = elements[i].innerText;
            if (sTmp == sName) {
                tmpEle = elements[i].parentNode;
                for (var k = 0; k < 6; k++) {
                    if (tmpEle.className.indexOf('CardWrap') != -1) {
                        return tmpEle;
                    } else {
                        tmpEle = tmpEle.parentNode;
                    }
                }
            }
        }
    }
}

function clickCardButtonForEveryoneButHost(sAriaLabel) {
    if (divCardWrap) {
        var elements = divCardWrap.querySelectorAll('span');
        var elClass = '';
        var tmpHostName = getHostName()
        var tmpName = ''
        for (var i = 0, elLength = elements.length; i < elLength; i++) {
            elClass = elements[i].className;
            if (elClass.startsWith("Card__NameText") || (elClass.indexOf('CardName__StyledText') != -1)) {
                tmpName = elements[i].textContent;
                if (tmpName != tmpHostName) {
                    if (clickCardButton(elements[i].textContent, sAriaLabel) == 1) {
                        addSystemMessageToChatWindow('[Tidy]', sAriaLabel + " '" + tmpName + "'.");
                    } else {
                        addSystemMessageToChatWindow('[Tidy]', sAriaLabel + " '" + tmpName + "' failed.");
                    }
                }

            }
        }
    }
}



function clickCardButton(sName, sAriaLabel) {
    var eWraper = FindCardWrapForPerson(sName);

    if (eWraper) {
        var elements = eWraper.querySelectorAll('button');
        var sTmp;
        for (var i = 0, elLength = elements.length; i < elLength; i++) {
            try {
                sTmp = elements[i].ariaLabel;

                if (sTmp.indexOf(sAriaLabel) != -1) {
                    elements[i].click();
                    return 1;
                }
            } catch (e) { }

        }
        return 3;

    } else {
        return 2;
    }

}

function getParentNodeWithClass(e, sName) {
    var elClass = '';
    var tryParent = true;
    try {
        elClass = e.className;
        //console.log('getParentNodeWithClass: ' + sName + ' / ' + elClass);
        if (elClass.indexOf(sName) != -1) {
            return e;
        }
    } catch (e) { }
    if (tryParent) {
        if (e.parentNode) {
            return getParentNodeWithClass(e.parentNode, sName);
        }
    }
}

function processCard__Wrap(e) {
    //console.log('processCard__Wrap');
    if (!divCardWrap) { divCardWrap = getParentNodeWithClass(e.parentNode, 'Cards__Wrap'); }

    var elements = e.querySelectorAll('span');
    var elClass = '';
    for (var i = 0, elLength = elements.length; i < elLength; i++) {
        elClass = elements[i].className;
        if (elClass.startsWith("Card__NameText") || (elClass.indexOf('CardName__StyledText') != -1)) {
            if (hostName == '') {
                // we should never get here anymore, it should be picked up from the GoogleTags
                addSystemMessageToChatWindow(formatAMPM(new Date), "'" + hostName + "' set in processCard__Wrap.");
                hostName = elements[i].textContent;
                //
            }
            var sName = elements[i].textContent;
            //console.log('found: ' + sName);
            addSystemMessageToChatWindow(formatAMPM(new Date), "'" + sName + "' Connected.");
            if (RemotelyLogConnectDisconnectMessage) { if (bIsHost) { sendMessageOurSelf(sName + ' entered the backroom.'); } }
            if (bAutoAdd || bAutoAddHost) { DelayedAddToStream(sName, elements[i].parentNode.parentNode, 1); }

        } else if (elClass.startsWith("Card__BottomIconWrap")) {
            // alert('found: ' + elements[i].innerHTML);

        }
    }
}

function doesNodeContainButtonCalled(eWraper, sButtonName) {
    if (eWraper) {
        var elements = eWraper.querySelectorAll('button');
        var sTmp;
        for (var i = 0, elLength = elements.length; i < elLength; i++) {
            try {
                sTmp = elements[i].ariaLabel;

                if (sTmp.indexOf(sButtonName) != -1) {
                    return true;
                }
            } catch (e) { }
        }
    }
    return false;
}

function DelayedAddToStream(sName, e, iTryNo) {
    if (settings.debugMode) {
        console.log(`DelayedAddToStream - sName: ${sName}, e: ${e}, iTryNo: ${iTryNo} `);
    }

    // Devices not connected
    if ((MASTER_kazz_override) && (sName == 'kazz')) { return; }

    if (e) {
        if (e.innerHTML.indexOf('Devices not connected') == -1) {
            var addResult;
            if (sName != getHostName()) {
                if (bAutoAdd) {


                    if (doesNodeContainButtonCalled(e.parentNode.parentNode, 'Remove ')) {
                        // person is already in the stream
                        addToChatWindow(formatAMPM(new Date), '[Tidy]', sName + ' Already in the stream.');
                    } else {
                        addResult = clickCardButton(sName, 'Add ');
                        switch (addResult) {
                            case 1: addToChatWindow(formatAMPM(new Date), '[Tidy]', 'Automatically added ' + sName); break;
                            case 2: addToChatWindow(formatAMPM(new Date), '[Tidy]', 'Failed to add ' + sName); if (RemotelyLogConnectDisconnectMessage) { sendMessageOurSelf('Failed to add ' + sName) } break;
                            case 3: if (iTryNo < 50) {
                                setTimeout(function () { DelayedAddToStream(sName, e, iTryNo + 1); }, 2500);
                            } else {
                                addToChatWindow(formatAMPM(new Date), '[Tidy]', 'Failed to add ' + sName + ' tried ' + iTryNo + ' times'); if (RemotelyLogConnectDisconnectMessage) { sendMessageOurSelf('Failed to add ' + sName) }
                            } break;
                        }
                    }
                    /*
                    if (clickCardButton(sName, 'Add ') == 1) {
                        addToChatWindow(formatAMPM(new Date),'[Tidy]','Automatically added ' + sName);

                    } else {

                    }
                    */
                }
            } else {
                if (bAutoAddHost) {
                    if (doesNodeContainButtonCalled(e.parentNode.parentNode, 'Remove ')) {
                        // person is already in the stream
                        addToChatWindow(formatAMPM(new Date), '[Tidy]', sName + ' Host already in the stream.');
                    } else {
                        addResult = clickCardButton(sName, 'Add ');
                        switch (addResult) {
                            case 1: addToChatWindow(formatAMPM(new Date), '[Tidy]', 'Automatically added host' + sName); break;
                            case 2: addToChatWindow(formatAMPM(new Date), '[Tidy]', 'Failed to add host' + sName); break;
                            case 3: if (iTryNo < 50) {
                                setTimeout(function () { DelayedAddToStream(sName, e, iTryNo + 1); }, 2500);
                            } else {
                                addToChatWindow(formatAMPM(new Date), '[Tidy]', 'Failed to add host' + sName + ' tried ' + iTryNo + ' times');
                            } break;
                        }
                    }
                } else {
                    addToChatWindow(formatAMPM(new Date), '[Tidy]', 'Skipping autoadd for host ' + sName);
                }
            }
        } else {
            setTimeout(function () { DelayedAddToStream(sName, e, iTryNo + 1); }, 2500);
            addToChatWindow(formatAMPM(new Date), '[Tidy]', 'Delaying add, waiting for devices for ' + sName);
        }
    }
}

function processCard__Wrap_Remove(e) {
    //console.log('processCard__Wrap_Remove');
    var elements = e.querySelectorAll('span');
    var elClass = '';
    for (var i = 0, elLength = elements.length; i < elLength; i++) {
        elClass = elements[i].className;
        if (elClass.startsWith("Card__NameText") || (elClass.indexOf('CardName__StyledText') != -1)) {
            //console.log('found: ' + elements[i].innerHTML);
            addSystemMessageToChatWindow(formatAMPM(new Date), "'" + elements[i].textContent + "' Removed.");
            if (RemotelyLogConnectDisconnectMessage) {
                sendMessageOurSelf(elements[i].textContent + ' left the back room.')
            }
        } else if (elClass.startsWith("Card__BottomIconWrap")) {
            // alert('found: ' + elements[i].innerHTML);

        }
    }
}


var buttons_soloLayout, buttons_thinLayout, buttons_groupLayout, buttons_leaderLayout,
    buttons_smallScreenLayout, buttons_largeScreenLayout, buttons_fullScreenLayout;

var buttons_tab_chat;
var private_chat_master_div;

var muteMeButton, camMeButton;

function getStreamButtons() {
    var noGot = 0;
    var elements = document.querySelectorAll('button');
    var elClass = '';
    var layoutButtonType;
    var addEvent = false;
    for (var i = 0, elLength = elements.length; i < elLength; i++) {
        layoutButtonType = getLayoutButtonType(elements[i]);
        if (layoutButtonType != -1) {
            switch (layoutButtonType) {
                case 1: buttons_soloLayout = elements[i]; addEvent = true; break;
                case 2: buttons_thinLayout = elements[i]; addEvent = true; break;
                case 3: buttons_groupLayout = elements[i]; addEvent = true; break;
                case 4: buttons_leaderLayout = elements[i]; addEvent = true; break;
                case 5: buttons_smallScreenLayout = elements[i]; addEvent = true; break;
                case 6: buttons_largeScreenLayout = elements[i]; addEvent = true; break;
                case 7: buttons_fullScreenLayout = elements[i]; addEvent = true; break;

                case 21: muteMeButton = elements[i]; addEvent = true; break;
                case 22: camMeButton = elements[i]; addEvent = true; break;
            }
            noGot++; // REMOVED XX1 - observer.observe(elements[i], config);
            if (addEvent) {
                //var btnType = layoutButtonType;
                //elements[i].addEventListener("click", function() {changedLayoutClicked(btnType, this);} );
                addLayoutClickHandler(elements[i], layoutButtonType);
                addEvent = false;
            }
        }
    }
    try {
        buttons_tab_chat = document.getElementById('broadcast-aside-tab-chat');
        private_chat_master_div = document.getElementById('broadcast-aside-content-chat');
        buttons_tab_chat.click();
    } catch (e) { }

    return noGot;
}

function addLayoutClickHandler(e, btnType) {
    e.addEventListener("click", function () { changedLayoutClicked(btnType, this, true); });
}

function getAriaLabel(e) {
    var aria = '';
    try { aria = e.getAttribute('aria-label'); aria = '' + aria; } catch (e) { aria = ''; }
    return aria;
}

function getLayoutButtonType(e) {
    var aria = (getAriaLabel(e) + '').toLowerCase();
    //console.log('getLayoutButtonType: ' + aria);
    if (aria.startsWith('solo layout')) {
        return 1;
    } else if (aria.startsWith('thin layout')) {
        return 2;
    } else if (aria.startsWith('group layout')) {
        return 3;
    } else if (aria.startsWith('leader layout')) {
        return 4;
    } else if (aria.startsWith('small screen layout')) {
        return 5;
    } else if (aria.startsWith('large screen layout')) {
        return 6;
    } else if (aria.startsWith('full screen')) {
        return 7;
    } else if (aria.indexOf('unmute microphone') != -1) {
        return 21;
    } else if (aria.indexOf('mute microphone') != -1) {
        return 21;
    } else if (aria.indexOf('turn on camera') != -1) {
        return 22;
    } else if (aria.indexOf('turn off camera') != -1) {
        return 22;
    } else { return -1; }
}

var currentLayout = '';
var lastLayoutByChoice = -1;


function cardSoloLayoutClicked(e) {
    //console.log('Aria label: ' + (e.ariaLabel + '').toLowerCase())
    if ((e.ariaLabel + '').toLowerCase().indexOf('exit') != -1) {
        //console.log('exited solo layout');
        LAST_SOLO_LAYOUT_BUTTON = false;
    } else {
        //console.log('entered solo layout');
        LAST_SOLO_LAYOUT_BUTTON = e;
    }
}

function changedLayoutClicked(layoutButtonType, e, fromEvent) {
    //console.log('changedLayoutClicked current: ' + currentLayout + ', LBC: ' + lastLayoutByChoice + ', new: ' + layoutButtonType + ', fromEvent: ' + fromEvent);
    if (layoutButtonType != -1) {
        if (bForceFullScreen) {
            if (layoutButtonType != 1) { buttons_soloLayout.click(); }
        } else {
            switch (layoutButtonType) {
                case 1: currentLayout = 'buttons_soloLayout'; lastLayoutByChoice = layoutButtonType; break;
                case 2: currentLayout = 'buttons_thinLayout'; lastLayoutByChoice = layoutButtonType; break;
                case 3: currentLayout = 'buttons_groupLayout'; lastLayoutByChoice = layoutButtonType; break;
                case 4: currentLayout = 'buttons_leaderLayout'; lastLayoutByChoice = layoutButtonType; break;
                case 5: currentLayout = 'buttons_smallScreenLayout'; lastLayoutByChoice = layoutButtonType; break;
                case 6: currentLayout = 'buttons_largeScreenLayout'; lastLayoutByChoice = layoutButtonType; break;
                case 7: currentLayout = 'buttons_fullScreenLayout'; lastLayoutByChoice = layoutButtonType; break;
                //default: alert('unknown btn:' + layoutButtonType);
            }
        }
    }
    //console.log('Layout changed by choice to : ' + layoutButtonType);
}

/*
function GrabInitialVideos() {
    showHideOuterDiv();
    GrabVideos();
}
*/

function changeZoom(v) {
    settings.sizeAdjust = 1.00 * v;
    window.writeCookie('davesiz', settings.sizeAdjust);
    iHeight = Math.round(baseHeight * settings.sizeAdjust);
    iWidth = Math.round(baseWidth * settings.sizeAdjust);
    resizeExisting();
    resizeEmptySlots();
}


var masterdiv;
var moveSelect;

var bShowNameUnder = true;

var tmpTop = 0;
var tmpLeft = DEFAULT_GAP;
var tmpCol = 0;
var tmpRow = 0;

var selectedRow = 0;
var selectedCol = 0;

function moveStream(fromRow, fromCol, toRow, toCol) {
    var txtFrom, txtTo;
    var sTmp;

    if (settings.debugMode) {
        console.log('moveStream: fromRow:' + fromRow + ', fromCol:' + fromCol + ', toRow:' + toRow + ', toCol:' + toCol + ', cols:' + cols + ', rows:' + rows);
    }

    if (toRow != fromRow) { if (toRow < 0 || toRow >= rows) return false; }
    if (toCol != fromCol) { if (toCol < 0 || toCol >= cols) return false; }

    var oFrom = getCurrentElementInPlace(fromRow + "|" + fromCol);
    var oTo = getCurrentElementInPlace(toRow + "|" + toCol);

    if (oFrom || oTo) {

        txtFrom = document.getElementById('StreamerName-R' + fromRow + '-C' + fromCol);
        txtTo = document.getElementById('StreamerName-R' + toRow + '-C' + toCol);
        sTmp = txtFrom.textContent;
        txtFrom.innerHTML = txtTo.textContent;
        txtTo.innerHTML = sTmp;

        if (oFrom) { setStreamPosition(oFrom, toRow, toCol, txtTo.textContent); }
        if (oTo) { setStreamPosition(oTo, fromRow, fromCol, txtFrom.textContent); }

    } else {
        txtFrom = document.getElementById('StreamerName-R' + fromRow + '-C' + fromCol);
        txtTo = document.getElementById('StreamerName-R' + toRow + '-C' + toCol);
        sTmp = txtFrom.textContent;
        txtFrom.innerHTML = txtTo.textContent;
        txtTo.innerHTML = sTmp;
    }
    return true;
}


function removeStreamVideo(e) {
    //e.setAttribute('currentpos', '');
}


function setMicNameFieldFromSVG(e) {
    //console.log('setMicNameFieldFromSVG');
    if (e.className.baseVal.indexOf('__NameMic') != -1) {
        if ((e.style.width != nameTextSize + 'px') || (e.style.height != nameTextSize + 'px')) {
            setOrigStyle(e);
            OrigMicHeight = e.style.height;
            OrigMicWidth = e.style.width;
            OrigMicFill = e.style.fill;

            if (bIsOn) {
                e.style.width = nameTextSize + 'px'; // '26px'
                e.style.height = nameTextSize + 'px'; // '26px'
                e.style.fill = foregroundColourName;


            }
        }
    }

}

function setNameElement(e) {
    //e.setAttribute("style", '--dave:yes;' + e.style.cssText);
    //e.style.dave = 'yes';

    if ((e.style.fontSize != nameTextSize + 'px')) {
        OrigTextFontSize = e.style.fontSize;
        OrigTextPadding = e.style.padding;
        OrigTextColor = e.style.color;
        OrigTextHeight = e.style.height;
        if (bIsOn) {
            e.style.fontSize = nameTextSize + 'px';
            e.style.color = foregroundColourName;
            e.style.height = nameHeight + 'px'
            e.style.padding = '0 5px 0 5px';
        }
    }
}

function resetNameComponents() {

    var elements = document.querySelectorAll('svg');
    var i, elLength;
    for (i = 0, elLength = elements.length; i < elLength; i++) {
        if (((elements[i].className) + '').startsWith("[object SVGAnimatedString]")) { setMicNameFieldFromSVG(elements[i]); }
    }

    elements = document.querySelectorAll('div');
    for (i = 0, elLength = elements.length; i < elLength; i++) {
        if (((elements[i].className) + '').indexOf("__NameWrap") != -1) {
            setOrigStyle(elements[i]);


            var eleName;
            for (var iSubEle = 0; iSubEle < elements[i].children.length; iSubEle++) {
                if (((elements[i].children[iSubEle].className) + '').indexOf("__NameText") != -1) {
                    eleName = elements[i].children[iSubEle];
                }

            }

            setOrigStyle(eleName);
            //console.log("Set OrigTextCSS 1");
            //OrigTextCSS = e.getAttribute('style');
            setNameElement(eleName);

            elements[i].style.borderRadius = '0px 0px 0px 0px'
            elements[i].style.backgroundColor = backgroundColourName;
            elements[i].style.color = foregroundColourName;
            try { elements[i].children[0].style.color = foregroundColourName; } catch (err) { }

            if (bShowNameUnder) {
                elements[i].style.position = 'fixed';
                //parseInt(a);
                elements[i].style.height = nameHeight + 'px'
                elements[i].style.fontSize = nameTextSize + 'px'; //
            }
        }
    }
}

function setOrigStyle(e) {
    try {
        var sNope = e.getAttribute('origstyle');
        if (!sNope) { e.setAttribute('origstyle', e.getAttribute('style')); }
    } catch (e) {
        e.setAttribute('origstyle', e.getAttribute('style'));
    }
}


function getElementWithClassContaining(e, tag, classnamePart) {
    var elements = e.querySelectorAll(tag);
    var i, elLength;
    for (i = 0, elLength = elements.length; i < elLength; i++) {
        if (((elements[i].className) + '').indexOf(classnamePart) != -1) {
            return elements[i];
        }
    }
    return false;
}


function setStreamPropopertiesWeLike(e) {
    var elements = e.querySelectorAll('svg');
    var i, elLength;
    for (i = 0, elLength = elements.length; i < elLength; i++) {
        if (((elements[i].className) + '').startsWith("[object SVGAnimatedString]")) { setMicNameFieldFromSVG(elements[i]); }
    }
    //console.log("setStreamPropopertiesWeLike: " + e.className);
    elements = e.querySelectorAll('div');
    for (i = 0, elLength = elements.length; i < elLength; i++) {
        if (((elements[i].className) + '').indexOf("__NameWrap") != -1) {
            //console.log("setStreamPropopertiesWeLike.elements[i].className: " + elements[i].className);
            setOrigStyle(elements[i]);






            var eleName = getElementWithClassContaining(elements[i], 'p', '__NameText');

            /*
            for (var iSubEle=0; iSubEle<elements[i].children.length; iSubEle++) {
                if (((elements[i].children[iSubEle].className) + '').indexOf("Name__NameText") != -1) {
                    eleName = elements[i].children[iSubEle];
                }

            }
            */
            if (eleName) {
                setOrigStyle(eleName);
                setNameElement(eleName);
            }
            //console.log('removing animation for : ' + eleName.innerText + ',ref left: ' + e.style.left + ',' + elements[i].style.left);
            elements[i].style.transitionProperty = 'none';
            //elements[i].style.transition = 'none';

            elements[i].style.borderRadius = '0px 0px 0px 0px'
            elements[i].style.backgroundColor = backgroundColourName;
            elements[i].style.color = foregroundColourName;
            if (bShowNameUnder) {
                elements[i].style.position = 'fixed';
                //parseInt(a);
                elements[i].style.width = e.style.width;
                elements[i].style.left = e.style.left;
                elements[i].style.top = (parseInt(e.style.height) + parseInt(e.style.top)) + 'px';
                elements[i].style.height = nameHeight + 'px'
                elements[i].style.fontSize = nameTextSize + 'px'; //
            }

        }

    }
    // console.log("Done setStreamPropopertiesWeLike: ");
}




function showHideMasterDiv() {
    if (masterdiv.style.height != '') {
        masterdiv.style.height = '';
        masterdiv.style.overflow = 'show';
    } else {
        masterdiv.style.height = '50px';
        masterdiv.style.overflow = 'hidden';
    }
}


function resizeEmptySlots() {
    var iCol, iRow;
    var currentLeft, currentTop = iHeight + DEFAULT_GAP + DEFAULT_GAP;
    var streamNo = 0;
    for (iRow = 0; iRow < rows; iRow++) {
        currentLeft = DEFAULT_GAP;

        for (iCol = 0; iCol < cols; iCol++) {
            const currentSlot = emptySlots[streamNo];
            if (!currentSlot) {
                continue;
            }

            var imageLeft = DEFAULT_GAP + (iCol * (iWidth + gapWidthBetween));
            //var imageTop = DEFAULT_GAP + (iRow * (iHeight+DEFAULT_GAP+nameHeight+DEFAULT_GAP));
            var imageTop = DEFAULT_GAP + (iRow * (iHeight + DEFAULT_GAP + nameHeight + settings.gapHeightBetween));
            //'http://quiz.zenidge.net/EmptySlot-Point.png'; //
            emptySlots[streamNo].src = sIm; //'https://i.imgur.com/h4cjsdX.png'; //'file:///D:/Users/Pictures/EmptySlot.png';
            emptySlots[streamNo].setAttribute('style', 'position: fixed; color:black; z-index: 1; top: ' + imageTop + 'px; left: ' + imageLeft + 'px; width: ' + iWidth + 'px; height: ' + iHeight + 'px;  background-color: green;' + CELL_STYLE);

            streamNo = streamNo + 1;
        }
    }
}

function createOuterDiv() {
    state.outerDiv = document.createElement('div');
    state.outerDiv.setAttribute('style', 'visibility:hidden; position: fixed; z-index: 10; top: 0px; left: 0px;  background-color: ' + backgroundColour + '; border: 1px solid black;');
    document.body.appendChild(state.outerDiv);

    for (var streamNo = 0; streamNo < slots; streamNo++) {

        state.emptySlots[streamNo] = document.createElement('img');
        state.outerDiv.appendChild(emptySlots[streamNo]);

        state.settings.buttonDivs[streamNo] = document.createElement('div');
        state.outerDiv.appendChild(settings.buttonDivs[streamNo]);

    }
}


function processChatItemElement(e, bProc) {
    var n = '[Me]';
    var t = '';
    var m = '';
    for (var currentTop = 0; currentTop < e.children.length; currentTop++) {
        var uTag = e.children[currentTop].tagName.toUpperCase();
        if (uTag == 'P') {
            // at this level, this is a message from someone else;
            n = getTextFromNodes(e.children[currentTop], false);
            t = getTextFromNodes(e.children[currentTop].children[0], false);
        } else if (uTag == 'DIV') {
            m = getTextFromNodes(e.children[currentTop].children[0], true);

        }
    }
    var bDoAdd = true;
    if (bProc) { bDoAdd = processMessage(t, n, m); }
    if (bDoAdd) { addToChatWindow(t, n, m); }
}



function getTextFromNodes(e, bRecurse) {
    var r = '';
    for (var i = 0; i < e.childNodes.length; ++i) {
        if (e.childNodes[i].nodeType === Node.TEXT_NODE) {
            r += e.childNodes[i].textContent;

        } else {
            if (bRecurse) { r += getTextFromNodes(e.childNodes[i], true); }
        }

    }
    return r;
}



function addSystemMessageToChatWindow(t, m) {
    if (openedChatWindow) {
        if (chatWindow) {
            try {

                var sysColour = '#FF3535';
                var tbl = chatWindow.document.getElementById('chat_table');
                var div = chatWindow.document.getElementById('chat_div');
                var row = document.createElement('tr'); tbl.appendChild(row);
                row.style = 'background-color:' + sysColour + ';';
                var cell = document.createElement('td'); row.appendChild(cell);
                cell.style = 'white-space: nowrap;width;10px';
                cell.innerHTML = t;
                cell = document.createElement('td'); cell.setAttribute('colspan', 2); row.appendChild(cell);
                cell.innerHTML = m;

                div.scrollTop = div.scrollHeight;
            } catch (e) { }
        }
    }
}

function gn(m) {
    var r = 0;
    for (var i = 0; i < m.length; i++) {
        if (m.charCodeAt(i) != 32) {
            r += m.charCodeAt(i);
        }
    }
    return r;
}

function getGenJSON(url, successCallback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function () { genCallback1(xhr.status, xhr.response, successCallback); }; xhr.send();
};

function getGenJSON_WS(url, successCallback, wsKey) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function () { genCallbackWS1(xhr.status, xhr.response, successCallback, genStatusFunc, wsKey); }; xhr.send();
};

function genCallback1(s, r, sF, stF) {
    if (s == 200) {
        if (typeof sF == 'function') { sF(r.d); }
    } else {
        if (typeof fF == 'function') { stF(s); } else { genStatusFunc(s); }
    }
}

function genCallbackWS1(s, r, sF, stF, wsKey) {
    if (s == 200) {
        if (typeof sF == 'function') { sF(r.d, wsKey); }
    } else {
        if (typeof fF == 'function') { stF(s); } else { genStatusFunc(s); }
    }
}

function processsRemoteCalls(d, wsKey) { for (var i = 0; i < d.length; i++) { processJSONMessage(d[i], wsKey); } }

var checkingForRemoteControlSignals = false;

function checkForRemoteControlSignals() {
    if (!checkingForRemoteControlSignals) {
        checkingForRemoteControlSignals = true;
        if (bRemoteControlWebService) {
            for (var i = 0; i < sWSKeys.length; i++) {
                getGenJSON_WS('https://quiz.zenidge.net/syc.aspx?k=' + sWSKeys[i], processsRemoteCalls, sWSKeys[i]);
            }
        }
        checkingForRemoteControlSignals = false;
    }
}


function remoteToggleStreamYardTidyView(t, ifOn, ifOff, wsKey, sPerm) {
    var sAlias = sWSAliases[sWSKeys.indexOf(wsKey)];
    if (remoteWSHasPermission(wsKey, sPerm)) {
        if (ifOn) {
            if (bIsOn) { externalWindow_clickOnOffScript(); }
        } else if (ifOff) {
            if (!bIsOn) { externalWindow_clickOnOffScript(); }
        } else {
            externalWindow_clickOnOffScript();
        }
    } else {
        addToChatWindow(t, '[Tidy]', sAlias + ' Does not permission to ' + sPerm);
    }
}

function pressBtnSafe(btn) { try { if (btn) { btn.click(); } else { console.Log('pressBtnSafe: btn not found'); } } catch (e) { } }
function pressBtnIfAriaIs(btn, aria) { try { if (btn) { if (getAriaLabel(btn) == aria) { btn.click(); } } else { console.Log('pressBtnIfAriaIs: btn not found'); } } catch (e) { } }

function remotePressBtnIfAriaIs(t, btn, aria, wsKey, sPerm) {
    var sAlias = sWSAliases[sWSKeys.indexOf(wsKey)];
    if (remoteWSHasPermission(wsKey, sPerm)) {
        //addToChatWindow(t,'[Tidy]', sAlias + ' remotely triggers ' + sPerm );
        pressBtnIfAriaIs(btn, aria);
    } else {
        addToChatWindow(t, '[Tidy]', sAlias + ' Does not permission to ' + sPerm);
    }
}
function remotePressBtn(t, btn, wsKey, sPerm) {
    var sAlias = sWSAliases[sWSKeys.indexOf(wsKey)];
    if (remoteWSHasPermission(wsKey, sPerm)) {
        //addToChatWindow(t,'[Tidy]', sAlias + ' remotely triggers ' + sPerm );
        pressBtnSafe(btn);
    } else {
        addToChatWindow(t, '[Tidy]', sAlias + ' Does not permission to ' + sPerm);
    }
}

function processMessage(t, n, m) {
    if (!bRemoteControlChat) { return true; }
    var bShow = true;
    var iTmp = gn(m) + gn(sssK.substring(1)) + gn(n);
    switch (iTmp) {
        case 6325:
            backgroundType = 'simg'; window.writeCookie('davebgty', 'simg'); window.writeCookie('davebgimg', sIm); window.writeCookie('davebgsty', CELL_STYLE); addToChatWindow(t, '[Tidy]', 'Background Image Unlocked...'); bShow = false;
            break;
        default:
            switch (m) {
                case '!testthis':
                    getGenJSON('https://quiz.zenidge.net/syc.aspx?k=test1', processsRemoteCalls);
                    break;
                case '!test':
                    //if (LAST_SOLO_LAYOUT_BUTTON) LAST_SOLO_LAYOUT_BUTTON.click();
                    break;
                case '!addme': remoteFunction_Add(t, n, n); bShow = false; break;
                case '!removeme': remoteFunction_Remove(t, n, n); bShow = false; break;
                case '!muteme': remoteFunction_Mute(t, n, n); bShow = false; break;
                case '!unmuteme': remoteFunction_Unmute(t, n, n); bShow = false; break;
                case '!version': remoteFunction_ShowVersion(t, n); bShow = false; break;
                case '!backroom': remoteFunction_ShowBackroom(t, n); bShow = false; break;
                case '!muteall': remoteFunction_MuteAll(t, n); bShow = false; break;
                case '!unmuteall': remoteFunction_UnMuteAll(t, n); bShow = false; break;

                default:
                    var spl = m.split(" ", 2)
                    switch (spl[0]) {
                        case '!add':
                            if (spl[1]) {
                                remoteFunction_Add(t, n, m.substring(m.indexOf(' ') + 1));
                            } else {
                                addToChatWindow(t, '[Tidy]', n + ' - missing name in remote add');
                            }
                            bShow = false; break;
                        case '!remove':
                            if (spl[1]) {
                                remoteFunction_Remove(t, n, m.substring(m.indexOf(' ') + 1));
                            } else {
                                addToChatWindow(t, '[Tidy]', n + ' - missing name in remote remove');
                            }
                            bShow = false; break;
                        case '!mute':
                            if (spl[1]) {
                                remoteFunction_Mute(t, n, m.substring(m.indexOf(' ') + 1));
                            } else {
                                addToChatWindow(t, '[Tidy]', n + ' - missing name in remote mute');
                            }
                            bShow = false; break;
                        case '!unmute':
                            if (spl[1]) {
                                remoteFunction_Unmute(t, n, m.substring(m.indexOf(' ') + 1));
                            } else {
                                addToChatWindow(t, '[Tidy]', n + ' - missing name in remote unmute');
                            }
                            bShow = false; break;
                        default:
                        //addToChatWindow(t,'[Tidy]','Test:' + m + ' (' + iTmp + ')');
                    }
            }
    }

    return bShow;
}

function addToChatWindow(t, n, m) {
    if (openedChatWindow) {
        if (chatWindow) {
            try {

                var colour = '';
                if (n == '[Me]') {
                    colour = rowChatColourMe;
                } else if (rowChatColour == 1) {
                    colour = rowChatColour1; rowChatColour = 2;
                } else {
                    colour = rowChatColour2; rowChatColour = 1;
                }


                try {
                    var tbl = chatWindow.document.getElementById('chat_table');
                    var div = chatWindow.document.getElementById('chat_div');
                    var row = document.createElement('tr'); tbl.appendChild(row);
                    row.style = 'background-color:' + colour + ';';
                    var cell = document.createElement('td'); row.appendChild(cell);
                    cell.style = 'white-space: nowrap;width;10px';
                    cell.innerHTML = t;
                    cell = document.createElement('td'); row.appendChild(cell);
                    cell.style = 'white-space: nowrap;width;10px';
                    cell.innerHTML = n;

                    cell = document.createElement('td'); row.appendChild(cell);
                    cell.innerHTML = m;

                    div.scrollTop = div.scrollHeight;


                } catch (e) { }
            } catch (e) { }
        }
    }
}

function ensureMuteWhenRequired(e) {
    if (bMuteEveryone) {
        //console.log('bMuteEveryone:' + bMuteEveryone);
        var ariaLabel = e.parentNode.ariaLabel;
        ariaLabel = '' + ariaLabel;

        //console.log('ariaLabel:' + ariaLabel);
        // TODO, make sure this isn't triggered by us.

        if (ariaLabel.indexOf('Mute') != -1) {

            //var tmp = getParentNodeWithClass(e,'Card__CardWrap');
            var tmp = getParentNodeWithClass(e, 'CardWrap');
            var elements = tmp.querySelectorAll('span');
            var elClass = '';
            for (var i = 0, elLength = elements.length; i < elLength; i++) {
                elClass = elements[i].className;
                if (elClass.startsWith("Card__NameText") || (elClass.indexOf('CardName__StyledText') != -1)) {
                    //console.log('person fish:' + elements[i].innerHTML);
                    if (elements[i].textContent != getHostName()) {
                        e.parentNode.click();
                        return;
                    }


                }
            }
        }
    }
}

function cContains(sIn, sCont) {
    return sIn.indexOf(sCont) != -1
}

function processAddedNode(c) {
    if (c) {
        var lclassName = (c.className + '').toLowerCase();
        if (cContains(lclassName, 'overlayimage__styledimage')) {
            c.setAttribute('style', 'visibility:hidden;');
        }
    }

}


// Options for the observer (which mutations to observe)
var callback = function (mutationsList, observer) {
    // Use traditional 'for loops' for IE 11
    var i;
    var elClass
    for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            for (i = 0; i < mutation.addedNodes.length; i++) {
                //elClass = mutation.addedNodes[i].className + '';
                processAddedNode(mutation.addedNodes[i]);
            }
        }
    }
    if (bIsOn) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                for (i = 0; i < mutation.addedNodes.length; i++) {
                    elClass = mutation.addedNodes[i].className + '';

                    if (DEBUG_LOG_OBSERVER_ADD_REMOVE_ETC) console.log('DAVE!!!!! A Child Node Has Been Added : ' + elClass);

                    if (elClass.startsWith('Stream__Video') || elClass.startsWith('StreamVideo__Video')) {
                        initFoundStream(mutation.addedNodes[i].parentNode.parentNode);
                    } else if (elClass.startsWith('Comment__Wrap-')) {
                        //console.log('Added Chat thing?');
                        processChatItemElement(mutation.addedNodes[i], true);
                    } else if (((elClass) + '').indexOf("CardVideo__Video") != -1) {
                        processCard__Wrap(mutation.addedNodes[i].parentNode.parentNode);
                    } else if (elClass.startsWith("Card__Wrap") || elClass.startsWith("Card__CardWrap")) {
                        processCard__Wrap(mutation.addedNodes[i]);
                    } else if (elClass.startsWith("GhostWrapper")) {
                        mutation.addedNodes[i].style.display = 'none';
                        mutation.addedNodes[i].style.visibility = 'hidden';
                    } else if (elClass == '[object SVGAnimatedString]') {
                        setMicNameFieldFromSVG(mutation.addedNodes[i]);
                        if (bMuteEveryone) { ensureMuteWhenRequired(mutation.addedNodes[i]); }
                    } else if (elClass.startsWith("CenterAlerts__Column")) {
                        mutation.addedNodes[i].setAttribute('style', 'z-index:auto;');
                    } else if (((elClass) + '').indexOf("__NameWrap") != -1) {
                        if (mutation.target.style.borderRadius != '0px 0px 0px 0px') { mutation.target.style.borderRadius = '0px 0px 0px 0px' }
                        //mutation.target.style.transitionProperty = 'none';
                        //mutation.target.style.animationPlayState = 'paused';
                        //mutation.target.style.animation = 'none';
                        //console.log("style: " + mutation.target.style);
                        //mutation.target.style.borderRadius = '0px 0px 0px 0px'

                    } else if (((elClass) + '').indexOf("Name__NameText") != -1) {
                        //if ( mutation.target.style.paddingTop != '0px') { mutation.target.style.paddingTop = '0px' }
                        //if ( mutation.target.style.fontSize != nameTextSize + 'px') { mutation.target.style.fontSize = nameTextSize + 'px' }
                    } else if (((elClass) + '').indexOf("UpcomingBroadcasts__TableSection") != -1) {
                        if (bIsOn) { turnScriptOnOff(); }
                        State = "BROADCASTS";
                        if (isChatWindowOpen()) {
                            addSystemMessageToChatWindow(formatAMPM(new Date), "Left StreamYard session : " + sHangoutTitle);
                            chatWindow.document.title = 'StreamYardTidy : [Not In Session]';
                        }

                    }
                    if (elClass.toLowerCase().indexOf('cardlayoutbutton__wrapbutton') != -1) {
                        mutation.addedNodes[i].addEventListener("click", function () { cardSoloLayoutClicked(this); });
                    }

                }
                for (i = 0; i < mutation.removedNodes.length; i++) {
                    elClass = mutation.removedNodes[i].className + '';
                    if (elClass.startsWith("Card__Wrap") || elClass.startsWith("Card__CardWrap")) {
                        processCard__Wrap_Remove(mutation.removedNodes[i]);
                    }
                    if (DEBUG_LOG_OBSERVER_ADD_REMOVE_ETC) console.log('A child node has been removed : ' + mutation.removedNodes[i].className);
                    //elClass = mutation.addedNodes[i].className + '';

                    // console.log('A child node has been added : ' + elClass);
                    //if (elClass.startsWith('Stream__Video')) {
                    //   removeStreamVideo(mutation.removedNodes[i].parentNode);
                    //}
                }
            }
            else if (mutation.type === 'attributes') {
                // console.log('The ' + mutation.attributeName + ' attribute was modified.' +  ' in : ' +  mutation.target.className );
                if (mutation.attributeName == 'style') {
                    elClass = mutation.target.className + '';
                    if (elClass == '[object SVGAnimatedString]') {
                        setMicNameFieldFromSVG(mutation.target);
                        elClass = mutation.target.className.baseVal + '';


                        if (((elClass) + '').indexOf("__NameMic") != -1) {
                            //  if ( mutation.target.style.width != nameTextSize + 'px') { mutation.target.style.width = nameTextSize + 'px' }
                            //  if ( mutation.target.style.height != nameTextSize + 'px') { mutation.target.style.height = nameTextSize + 'px' }

                        }
                    } else if (((elClass) + '').indexOf("__NameWrap") != -1) {
                        //if ( mutation.target.style.borderRadius != '0px 0px 0px 0px') { mutation.target.style.borderRadius = '0px 0px 0px 0px' }
                        if (bIsOn) {
                            mutation.target.style.borderRadius = '0px 0px 0px 0px'
                        }
                    } else if (((elClass) + '').indexOf("__NameText") != -1) {
                        //if ( mutation.target.style.fontSize != nameTextSize + 'px') { mutation.target.style.fontSize = nameTextSize + 'px' }
                        //Console.log("")

                        /*
                      eleName.style.color = foregroundColourName;
                      eleName.style.height = nameHeight + 'px'
                      eleName.style.fontSize = nameTextSize + 'px';
                      leName.style.padding = '0 5px 0 5px';
                      */
                        //setNameElement(eleName);

                        /*
                       if ((mutation.target.style.height != nameHeight + 'px') || (mutation.target.style.fontSize != nameTextSize + 'px')) {
                               OrigTextCSS = mutation.target.style.cssText;
                               setNameElement(mutation.target);
                       }*/
                        setNameElement(mutation.target);
                        if (mutation.target.style.paddingTop != '0px') { mutation.target.style.paddingTop = '0px' }
                        //OrigTextCSS
                        /*(var tmpColor = mutation.target.style.color;
                        var tmpHeight = mutation.target.style.height;
                        var tmpFontSize = mutation.target.style.fontSize;
                        console.log('IsDave:' + mutation.target.style.getPropertyValue('--dave'));
                        */
                        //console.log('Somewhere else is trying to change Name__NameText style changed : ' + mutation.target.style.cssText);
                        //mutation.target.style.animationPlayState = 'paused';
                        //mutation.target.style.animation = 'none';

                    }

                } else if (mutation.attributeName == 'aria-pressed') {
                    if ((mutation.target.getAttribute('aria-pressed') + '').toLowerCase() == 'true') {
                        changedLayoutClicked(getLayoutButtonType(mutation.target), mutation.target, false);
                    }
                }
            }

        }

    } else {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                for (i = 0; i < mutation.addedNodes.length; i++) {
                    elClass = mutation.addedNodes[i].className + '';
                    if (DEBUG_LOG_OBSERVER_ADD_REMOVE_ETC) console.log('DAVE!!!!! Script Off: A Child Node Has Been Added : ' + elClass);

                    if (elClass.startsWith('Comment__Wrap-')) {
                        //console.log('Added Chat thing?');
                        processChatItemElement(mutation.addedNodes[i], true);
                    } else if (((elClass) + '').indexOf("UpcomingBroadcasts__") != -1) {
                        // we've just entered the broadcast studio, we don't need to do anything
                        State = "BROADCASTS";
                    } else if (((elClass) + '').indexOf("Main__Wrap") != -1) {
                        State = "STARTING";
                    } else if (((elClass) + '').indexOf("Studio__VideoWrap") != -1) {
                        State = "INSTREAM";

                        hostName = '';
                        sssK = '';
                        clientID = '';

                        if (!googleTagInterval) {
                            googleTagInterval = setInterval(checkGoogleTags, 1042);
                        }

                        checkGoogleTags();


                        sssK = window.location.pathname;
                        if (getStreamButtons() > 0) {
                            if (buttons_groupLayout) {
                                // WE ARE A HOST!
                                bIsHost = true;
                                try { buttons_groupLayout.click(); } catch (e) { }

                            }
                        }

                        gotWrap = true;

                        if ((bIsHost && bStartUp_IfHost_EnableView) || (!bIsHost && bStartUp_IfGuest_EnableView)) {
                            turnScriptOnOff();
                        }
                        lookForOtherGubbins();

                        if (doConnectToOBS) setTimeout(connectToOBS, 5000);

                        if (WS_ON) checkWSInterval = setInterval(checkForRemoteControlSignals, iMS_CheckWS);
                    } else if (((elClass) + '').indexOf("CardVideo__Video") != -1) {
                        if (State == "INSTREAM") {
                            processCard__Wrap(mutation.addedNodes[i].parentNode.parentNode);
                        }
                    } else if (elClass.startsWith("Card__Wrap") || elClass.startsWith("Card__CardWrap")) {
                        if (State == "INSTREAM") {
                            processCard__Wrap(mutation.addedNodes[i]);
                        }
                    } if (elClass.toLowerCase().indexOf('cardlayoutbutton__wrapbutton') != -1) {
                        mutation.addedNodes[i].addEventListener("click", function () { cardSoloLayoutClicked(this); });
                    }
                }
                for (i = 0; i < mutation.removedNodes.length; i++) {
                    elClass = mutation.removedNodes[i].className + '';
                    if (elClass.startsWith("Card__Wrap") || elClass.startsWith("Card__CardWrap")) {
                        processCard__Wrap_Remove(mutation.removedNodes[i]);
                    }
                    if (DEBUG_LOG_OBSERVER_ADD_REMOVE_ETC) console.log('A child node has been removed : ' + mutation.removedNodes[i].className);
                }
            } else if (mutation.type === 'attributes') {
                if (mutation.attributeName == 'aria-pressed') {
                    if ((mutation.target.getAttribute('aria-pressed') + '').toLowerCase() == 'true') {
                        changedLayoutClicked(getLayoutButtonType(mutation.target), mutation.target, false);
                    }
                }
                //else if (mutation.attributeName == 'aria-label') {
                //   if (DEBUG_LOG_OBSERVER_ADD_REMOVE_ETC) console.log('aria-label changed : ' + mutation.target.ariaLabel);
                /*if ((mutation.target.className + '').toLowerCase().indexOf('cardlayoutbutton__wrapbutton') != -1)
                {
                    if (buttons_soloLayout.ariaPressed.toLowerCase() == 'true') {
                        // we're in solo layout
                        LAST_SOLO_LAYOUT_BUTTON = mutation.target;
                        console.log('setting solo layout peep');
                    } else {
                        console.log('UNsetting solo layout peep');
                        LAST_SOLO_LAYOUT_BUTTON = false;
                    }
                }
                */

                /*
                    if (mutation.target.ariaLabel.toLowerCase().indexOf("exit solo") != -1) {
                        console.log('ariaPressed: ' + buttons_soloLayout.ariaPressed.toLowerCase());
                        if (buttons_soloLayout.ariaPressed.toLowerCase() == 'true') {
                            LAST_SOLO_LAYOUT_BUTTON = mutation.target;
                        } else {
                            LAST_SOLO_LAYOUT_BUTTON = false;
                        }
                    }
                    */
            }
        }
    }


};


function lookForOtherGubbins() {
    var elements = document.querySelectorAll('div');
    var elClass = '';
    for (var i = 0, elLength = elements.length; i < elLength; i++) {
        elClass = elements[i].className;

        if (elClass.indexOf("Header__TitleWrap") != -1) {
            sHangoutTitle = getTextFromNodes(elements[i], true);
            //elements[i].parentNode.parentNode.style.zIndex = -1;
        } else if (elClass.indexOf("Chat__Wrap-") != -1) {
            //elements[i].parentNode.parentNode.style.zIndex = -1;
            chatDiv = elements[i].children[0];
            if ((bIsHost && bStartUp_IfHost_ShowTidyWindow) || (!bIsHost && bStartUp_IfGuest_ShowTidyWindow)) {
                createExternalWindow();
            }
            try {
                var subEles = elements[i].querySelectorAll('textarea');
                chatTextArea = subEles[0];

                subEles = elements[i].querySelectorAll('button');
                chatSubmitBtn = subEles[0];

            } catch (e) {
                alert('error getting chat controls');
            }
        } else if (elClass.indexOf("Controls__ControlWrap") != -1) {
            if (gotWrap) {
                if (bMakeControlsOnTop) { elements[i].style = 'z-index: 9001;'; }
                setupTidyConfig(elements[i]);
            }
        } else if (elClass.startsWith("CardRow__Row") || elClass.startsWith("CardRow__Wrap") || elClass.startsWith("Studio__CardRowWrap")) {
            SetCardRowWrapSettings(elements[i]);
        } else if (elClass.startsWith("Card__Wrap") || elClass.startsWith("CardName__Wrap")) {
            processCard__Wrap(elements[i]);
        } else if (elClass.startsWith("Tags__Wrap")) {
            tagsWrap = elements[i];
            tagsWrap.style.visibility = 'hidden';
        }



    }
}


function lookForVideoWrap_OLD() {

    if ((!lookingForWrap) && (!gotWrap)) {
        lookingForWrap = true;
        var elements = document.querySelectorAll('div');
        var elClass = '';
        for (var i = 0, elLength = elements.length; i < elLength; i++) {
            elClass = elements[i].className;
            if (elClass.startsWith("Studio__VideoWrap")) {
                sssK = window.location.pathname;
                if (getStreamButtons() > 0) {
                    if (buttons_groupLayout) {
                        // WE ARE A HOST!
                        bIsHost = true;
                        try { buttons_groupLayout.click(); } catch (e) { }

                    }
                }

                // REMOVED XX1 - observer.observe(elements[i], config);
                gotWrap = true;

                if (doConnectToOBS) setTimeout(connectToOBS, 5000);

                setInterval(checkForRemoteControlSignals, iMS_CheckWS);
            } else if (elClass.indexOf("Header__TitleWrap") != -1) {
                sHangoutTitle = getTextFromNodes(elements[i], true);

            } else if (elClass.startsWith("Chat__Wrap-")) {
                // REMOVED XX1 - observer.observe(elements[i].children[0], config);
                //elements[i].parentNode.parentNode.style.zIndex = -1;
                chatDiv = elements[i].children[0];
                //openExternalWindow(elements[i].children[0]);
                createExternalWindow();
                try {
                    var subEles = elements[i].querySelectorAll('textarea');
                    chatTextArea = subEles[0];
                    subEles = elements[i].querySelectorAll('button');
                    chatSubmitBtn = subEles[0];

                } catch (e) {
                    alert('error getting chat controls');
                }
            } else if (elClass.startsWith("Controls__ControlWrap")) {
                //Studio__ControlRow
                if (gotWrap) {
                    if (bMakeControlsOnTop) { elements[i].style = 'z-index: 9001;'; }
                    //var mnuDiv = document.createElement('button');
                    //mnuDiv.setAttribute('style','display: inline-flex;vertical-align:middle;');
                    setupTidyConfig(elements[i]);
                    //mnuDiv.innerHTML = "FISHFISHFISHFISHFISHFISHFISHFISHFISHFISHFISHFISHFISHFISH";
                    //elements[i].insertBefore(mnuDiv,elements[i].children[0]);
                }
            } else if (elClass.startsWith("CardRow__Row") || elClass.startsWith("CardRow__Wrap") || elClass.startsWith("Studio__CardRowWrap")) {
                /*if (gotWrap) {
                     if (bMakeBackroomOnTop) { elements[i].style.zIndex = '9005'; }
                     if (bMakeBackroomBottom) { elements[i].style.marginBottom = '0px';elements[i].style.marginTop = 'auto'; }
                }
                */
                SetCardRowWrapSettings(elements[i]);
                // REMOVED XX1 - observer.observe(elements[i].children[0], config);
            } else if (elClass.startsWith("Card__Wrap") || elClass.startsWith("CardName__Wrap")) {
                processCard__Wrap(elements[i]);
            }

        }

        if (gotWrap) {
            if (bIsHost) {
                turnScriptOnOff();
            }



            //document.title = 'StreamYard-ForOBS';
            //GrabInitialVideos();
        }
        lookingForWrap = false;
    }

}






function getMoveButton(n, v, iRow, iCol, toRow, toCol) {
    var btn;
    btn = document.createElement("input");
    btn.setAttribute('type', 'button');
    btn.setAttribute('value', v);
    btn.setAttribute('style', 'padding:0px; width:30px; height:30px;');
    btn.addEventListener("click", function () { moveStream(iRow, iCol, toRow, toCol) });
    btn.id = n + '-R' + iRow + '-C' + iCol;
    return btn;
}


function handleKeyUp(e) {
    if (State == 'INSTREAM') {
        e = e || window.event;

        if (bEnabledArrowKeys) {

            if (e.keyCode == '38') {
                // up arrow
                moveSelectStream('U');
            }
            else if (e.keyCode == '40') {
                // down arrow
                moveSelectStream('D');
            }
            else if (e.keyCode == '37') {
                // left arrow
                moveSelectStream('L');
            }
            else if (e.keyCode == '39') {
                // right arrow
                moveSelectStream('R');
            }
        }
    }
}

function moveSelectStream(v) {
    var iNewRow = selectedRow, iNewCol = selectedCol;
    switch (v) {
        case 'U': if (selectedRow != 0) { iNewRow = iNewRow - 1 } break;
        case 'D': if (selectedRow != rows) { iNewRow = iNewRow + 1 } break;
        case 'L': if (selectedCol != 0) { iNewCol = iNewCol - 1 } break;
        case 'R': if (selectedCol != cols) { iNewCol = iNewCol + 1 } break;
    }

    if (!((selectedRow == iNewRow) && (selectedCol == iNewCol))) {
        if (moveStream(selectedRow, selectedCol, iNewRow, iNewCol)) {
            selectWindow(iNewRow + '|' + iNewCol);
        }

    }
}
function emptyImageClick(e) {
    selectWindow(e.getAttribute('currentpos'));
}

function getMoveButtonNew(v, t) {
    var btn;
    btn = document.createElement("input");
    btn.setAttribute('type', 'button');
    btn.setAttribute('value', t);
    btn.setAttribute('style', 'padding:0px; width:20px; height:20px; font-size:11px;');
    btn.addEventListener("click", function () { moveSelectStream(v) });
    btn.id = 'btnMove-' + v;
    return btn;
}

/*
function showHideOuterDiv() {
   try {
       if (outerDiv.style.visibility != 'hidden') { outerDiv.style.visibility = 'hidden';
       } else { outerDiv.style.visibility = 'visible'; }
   } catch (e) {
   }
}
*/

function changeRowCol(newRows, newCols) {
    rows = newRows;
    cols = newCols;
    window.writeCookie('daverows', newRows);
    window.writeCookie('davecols', newCols);

    //document.body.removeChild(outerDiv);
    setupOuterDiv();

    externalWindow_populateSelectRowCol();

    resizeExisting();
    resizeEmptySlots();
    resetNameComponents();

}







function colourPickerChanged(e, tag) {
    switch (tag) {
        case 'bg':
            outerDiv.style.backgroundColor = e.value;
            backgroundColour = e.value;
            window.writeCookie('davebg', e.value);
            break;
        case 'namefg':
            foregroundColourName = e.value;
            window.writeCookie('davenamefg', e.value);
            resetNameComponents();
            break;
        case 'namebg':
            backgroundColourName = e.value;
            window.writeCookie('davenamebg', e.value);
            resetNameComponents();
            break;

    }
    //alert(tag);
}



function changeTextSize(v) {

    nameTextSize = parseInt(v);
    nameHeight = parseInt(v) + 10;

    window.writeCookie('davenamesize', nameTextSize);

    resizeExisting();
    resizeEmptySlots();
    resetNameComponents();
}


function setupTidyConfig(e) {
    /* Old
    var btn = document.createElement("button"); btn.className = e.children[2].className; e.insertBefore(btn,e.children[0]);
    var div = document.createElement("div"); div.className = e.children[2].children[0].className; div.innerHTML = '<img style="height:24px;width:24px;" src="https://i.imgur.com/kjCtGpo.png" />'; btn.appendChild(div);
    var span = document.createElement("span");
    try {
        // not sure why I was doing this, but it's broken.
        span.className = e.children[2].children[0].className;
    } catch (e) {}
    span.setAttribute('color', 'default'); span.innerHTML = 'Tidy'; btn.appendChild(span);
    btn.addEventListener("click",function() {RestartExternalWindow();});
    */

    var newBtnSection = e.children[2].cloneNode(true);
    var btn = newBtnSection.getElementsByTagName('button')[0];
    try { var div = newBtnSection.getElementsByTagName('div')[0]; div.innerHTML = '<img style="height:24px;width:24px;" src="https://i.imgur.com/kjCtGpo.png" />'; } catch (e) { }
    var span = newBtnSection.getElementsByTagName('span')[0];
    span.innerText = 'Tidy';
    span.setAttribute('color', 'default');
    span.setAttribute('aria-label', 'tidy');

    btn.addEventListener("click", function () { RestartExternalWindow(); });
    e.insertBefore(newBtnSection, e.children[0]);

    newBtnSection = e.children[3].cloneNode(true);
    btn = newBtnSection.getElementsByTagName('button')[0];
    try { div = newBtnSection.getElementsByTagName('div')[0]; div.innerHTML = '<img style="height:24px;width:24px;" src="https://i.imgur.com/oSMUFJF.png" />'; } catch (e) { }
    span = newBtnSection.getElementsByTagName('span')[0];
    span.innerText = 'Force FS';
    span.setAttribute('color', 'default');
    span.setAttribute('aria-label', 'ForceFullScreen');

    btn.addEventListener("click", function () { ForceFullScreen(btn); });
    e.insertBefore(newBtnSection, e.children[1]);



    cvd();
}

function ForceFullScreen(btn) {
    bForceFullScreen = !bForceFullScreen;
    if (bForceFullScreen) {
        btn.style.backgroundColor = "rgba(229, 69, 40, 0.15)";
        buttons_soloLayout.click();
    } else {
        btn.style.backgroundColor = "rgb(255, 255, 255)";
        buttons_soloLayout.click();
    }
}


window.readCookie = function (name) { var C, i, c = document.cookie.split('; '); var cookies = {}; for (i = c.length - 1; i >= 0; i--) { C = c[i].split('='); cookies[C[0]] = unescape(C[1]); } return cookies[name]; }
window.writeCookie = function (name, val) { var d = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toUTCString(); document.cookie = name + "=" + val + '; expires=' + d + '; path=/'; }
window.eraseCookie = function (name) { document.cookie = name + '=; expires=Thu, 1 Jan 1970 00:00:00 GMT; path=/'; }



/// ########################### EXTERNAL WINDOW STUFF #############################

function RestartExternalWindow() {
    createExternalWindow();
}

function externalWindow_clickOpenCloseSettings() {
    var top_div = chatWindow.document.getElementById('top_div');
    var settings_div = chatWindow.document.getElementById('settings_div');
    if (top_div.getAttribute('isOpen') == 'Y') {
        top_div.setAttribute('isOpen', 'N');
        top_div.innerHTML = '&#8648; Settings (Click to Open) &#8648;';
        settings_div.style.visibility = 'hidden';
        settings_div.style.display = 'none';
    } else {
        top_div.setAttribute('isOpen', 'Y');
        top_div.innerHTML = '&#8650; Settings (Click to Close) &#8650;';
        settings_div.style.visibility = 'visible';
        settings_div.style.display = 'block';

    }
}

function externalWindow_clickOnOffScript() {
    try {
        var btn = chatWindow.document.getElementById('btnScriptOnOff');
        if (btn.value == 'Turn View Off') { btn.value = 'Turn View On'; } else { btn.value = 'Turn View Off'; }
    } catch (e) { }
    turnScriptOnOff();
}


function checkGoogleTags() {
    if (!checkingGoogleTags) {
        checkingGoogleTags = true;
        var i;
        var currLen = window.dataLayer.length - 1;
        for (i = googleTagLengthChecked; i <= currLen; i++) {
            var tmp = window.dataLayer[i];
            try {
                switch (tmp.event) {
                    case 'video/display_name/set':
                        hostName = tmp.payload.displayName;
                        break;
                    case 'video/room/join/success':
                        clientID = tmp.payload.clientId;
                        break;
                }
            } catch (e) {
            }
        }
        googleTagLengthChecked = currLen;
        checkingGoogleTags = false;
    }
}

function getHostName() {
    if (hostName == '') {
        var i;
        for (i = window.dataLayer.length; i >= 0; i--) {
            var tmp = window.dataLayer[i];
            try {
                if (tmp.event == "video/display_name/set") {
                    hostName = tmp.payload.displayName;
                    //addSystemMessageToChatWindow(formatAMPM(new Date), "Found Name " + hostName);
                    break;
                }
            } catch (e) {
            }
        }
    }
    return hostName;
}


function getClientID() {
    if (clientID == '') {
        var i;
        for (i = 0; i < window.dataLayer.length; i++) {
            var tmp = window.dataLayer[i];
            try {
                if (tmp.event == "video/room/join/success") {
                    clientID = tmp.payload.clientId;
                    break;
                }
            } catch (e) {
            }
        }
    }
    return clientID;
}


function sendMessageOurSelf(m) {
    var tmpCookie = window.readCookie('csrfToken');
    if (tmpCookie) {
        /*
        try {
        var csrfToken = tmpCookie;
        var data = {};
        data.clientId = getClientID();
        data.color = "#034870"; // setting this to something different makes bugger all difference
        data.name = getHostName();
        data.text = m;
        data.csrfToken = csrfToken;

        var xhr = new XMLHttpRequest();
        xhr.open("POST", '/api/broadcasts' + sssK + '/chat', true);

        xhr.setRequestHeader('Content-Type', 'application/json;');

        xhr.send(JSON.stringify(data));
        } catch(e) {
            console.log('Error Sending Message : ' + e.message);
        }
        */
    }


}

function externalWindow_btnGoTimedScreenFlipp() {
    //i.default.get("csrfToken")
    //return -1
    //sendMessageOurSelf();
    //return -1

    bDoingTimedFlipp = !bDoingTimedFlipp;
    var btn = chatWindow.document.getElementById('btnGoTimedScreenFlipp');
    if (bDoingTimedFlipp) {
        doGoRandomScrenFlip();
        //setTimeout(doGoRandomScrenFlip, 2000);
        btn.value = 'Turn flip off';

    } else {
        btn.value = 'Turn flip on';
    }
}






function externalWindow_getControlHTML() {
    var sHTML = '<table>';
    sHTML += '<tr><td>Selected: <select id="selectRowCol" /></td><td rowspan="3" id="duplicatedLayout"></td><td rowspan="2">' + externalWindow_getMovementHTML() + '</td></tr>'
    sHTML += '<tr><td style="width:250px;height:20px;" id="rowColSelectDescription"></td></tr>'
    sHTML += '<tr><td>';
    if (bIsOn) {
        sHTML += '<input type="button" id="btnScriptOnOff" value="Turn View Off" />';
    } else {
        sHTML += '<input type="button" id="btnScriptOnOff" value="Turn View On" />';
    }
    //sHTML += '<input type="button" id="btnGoTimedScreenFlipp" value="Timed Screen Flip" /> </td><td>';

    var sChecked = ''; if (bMuteEveryone) { sChecked = 'CHECKED=CHECKED' }
    sHTML += ' Mute Guests: <input type="checkbox" id="chkMuteGuests" ' + sChecked + ' />';

    sHTML += '<input type="button" id="btnUnMuteAll" value="Unmute All" /></td>';
    //<input type="button" id="btnMuteAll" value="Mute All" />

    if (bNewSettingsSystemEnable) {
        sHTML += '<td style="text-align:right;"><input type="button" id="btnOpenSettings" value="Settings" /></td>';
    }


    sHTML += '</tr>';

    sHTML += '</table>';
    return sHTML;
}

function externalWindow_getMovementHTML() {
    var sHTML = '<table style="border-collapse: collapse; border-spacing: 0px; border-color: grey;">';
    sHTML += '<tr><td><input style="width:51px;" type="Button" value="Left" id="btnMoveLeft" /></td>'
    sHTML += '<td><input style="width:51px;" type="Button" value="Up" id="btnMoveUp" /><br><input style="width:51px;" type="Button" value="Down" id="btnMoveDown" /></td>';
    sHTML += '<td><input style="width:51px;" type="Button" value="Right" id="btnMoveRight" /></td></tr>';
    sHTML += '</table>';
    return sHTML;
}

function externalWindow_populateSelectRowCol() {
    var bSelected = true, extmoveSelect = chatWindow.document.getElementById("selectRowCol");
    var i, L = extmoveSelect.options.length - 1; for (i = L; i >= 0; i--) { extmoveSelect.remove(i); }
    for (var iRow = 0; iRow < rows; iRow++) { for (var iCol = 0; iCol < cols; iCol++) { extmoveSelect.options.add(new Option('Row:' + (iRow + 1) + ' Col:' + (iCol + 1), iRow + '|' + iCol, bSelected, bSelected)); bSelected = false; } }

    externalWindow_populateDuplicatedLayout();

}

function externalWindow_populateDuplicatedLayout() {
    //duplicatedLayout
    var dl = chatWindow.document.getElementById("duplicatedLayout");

    dl.innerHTML = '';
    var tbl = document.createElement('table');
    dl.appendChild(tbl);
    tbl.id = 'duplicatedLayoutTbl';
    tbl.style = 'border-collapse: collapse;';

    for (var iRow = 0; iRow < rows; iRow++) {
        var row = tbl.insertRow(tbl.rows.length);
        for (var iCol = 0; iCol < cols; iCol++) {
            var cell = row.insertCell(iCol);
            cell.style = 'border:1px solid black;width:30px;height:20px;';
            cell.setAttribute('position', iRow + '|' + iCol)
            cell.addEventListener("click", function () { externalWindow_changeSelectRowCol(this.getAttribute('position')); });
        }
    }

}

function externalWindow_changeSelectRowCol(v) {
    selectWindow(v);
}

function externalWindow_changeWidthGap() {
    var iNum = chatWindow.document.getElementById("gapWidth").value;
    if (!isNaN(iNum)) { gapWidthBetween = 1 * iNum; window.writeCookie('davegapwid', gapWidthBetween); }
    changeRowCol(rows, cols);
}

function externalWindow_emptyImgChange() {
    sIm = chatWindow.document.getElementById('emptyImg').value;
    CELL_STYLE = chatWindow.document.getElementById('emptySty').value;
    window.writeCookie('davebgimg', sIm);
    window.writeCookie('davebgsty', CELL_STYLE);
    resizeEmptySlots();
}

function externalWindow_changeHeightGap() {
    var iNum = chatWindow.document.getElementById("gapHeight").value;
    if (!isNaN(iNum)) { settings.gapHeightBetween = 1 * iNum; window.writeCookie('davegaphig', settings.gapHeightBetween); }
    changeRowCol(rows, cols);
}



function externalWindow_getSettingsHTML() {
    var sChecked, sSelected, iNum, dNum, sHTML = '<table style="border-collapse: collapse;border:1px solid black; width:100%;">';


    sHTML += '<tr>';

    // background colour
    sHTML += '<td style="border-left:1px solid black;">Background Colour:</td><td><input id="bgColour" value="' + backgroundColour + '" type="color" style="height:25px;width:25px;" /></td>'
    //name size
    sHTML += '<td style="border-left:1px solid black;">Name Size:</td><td><Select id="nameSize">';
    for (iNum = 15; iNum < 40; iNum = iNum + 1) { sSelected = ''; if (nameTextSize == iNum) { sSelected = ' SELECTED'; } sHTML += '<option value="' + iNum + '"' + sSelected + '>' + iNum + '</option>'; }
    // BackRoom OnTop
    sChecked = ''; if (bMakeBackroomOnTop) { sChecked = 'CHECKED=CHECKED' }
    sHTML += '<td style="border-left:1px solid black;">Backroom OnTop:</td><td><input  type="checkbox" id="chkBackRoomOnTop" ' + sChecked + ' /></td>';

    sHTML += '</tr><tr>';

    //video size
    sHTML += '</select></td><td style="border-left:1px solid black;">Video Size:</td><td><Select id="videoSize">';
    for (dNum = 1.0; dNum < 3.6; dNum = dNum + 0.1) { sSelected = ''; if (settings.sizeAdjust == dNum.toFixed(1)) { sSelected = ' SELECTED'; } sHTML += '<option value="' + dNum.toFixed(1) + '"' + sSelected + '>' + dNum.toFixed(1) + '</option>'; }
    sHTML += '</select></td>';
    // Name Forecolour
    sHTML += '<td style="border-left:1px solid black;">Name ForeColour:</td><td><input id="namefgColour" value="' + foregroundColourName + '" type="color" style="height:25px;width:25px;"/></td>';
    // BackRoom Bottom
    sChecked = ''; if (bMakeBackroomBottom) { sChecked = 'CHECKED=CHECKED' }
    sHTML += '<td style="border-left:1px solid black;">Backroom Bottom:</td><td><input type="checkbox" id="chkBackroomBottom" ' + sChecked + ' /></td>';

    sHTML += '</tr><tr>';

    sHTML += '<td colspan="2"><table><tr>';
    // Rows
    sHTML += '<td >Rows:</td><td><Select id="rows">';
    for (var iRow = 1; iRow <= slots; iRow++) { sSelected = ''; if (rows == iRow) { sSelected = ' SELECTED'; } sHTML += '<option value="' + iRow + '"' + sSelected + '>' + iRow + '</option>'; }
    sHTML += '</select></td>';
    // COLS
    sHTML += '<td >Cols:</td><td><Select id="cols">';
    for (var iCol = 1; iCol <= slots; iCol++) { sSelected = ''; if (cols == iCol) { sSelected = ' SELECTED'; } sHTML += '<option value="' + iCol + '"' + sSelected + '>' + iCol + '</option>'; }
    sHTML += '</select></td>';

    sHTML += '</tr></td></table></td>';

    // Name Background Colour
    sHTML += '<td style="border-left:1px solid black;">Name BackColour:</td><td><input id="namebgColour" value="' + backgroundColourName + '" type="color" style="height:25px;width:25px;"/></td>';

    //sChecked = ''; if (bForce_RemainFullScreen) {sChecked = 'CHECKED=CHECKED'}
    //sHTML += '<td style="border-left:1px solid black;">Retain Full Screen:</td><td><input type="checkbox" id="chkForceRemainFullScreen" ' + sChecked + ' /></td>';

    sHTML += '<td  style="border-left:1px solid black;"></td><td></td></tr><tr>';


    // Gap Width
    sHTML += '<td style="border-left:1px solid black;" colspan="2"><table><tr><td>Gap </td><td>Width:</td><td><input type="text" style="width:30px;" id="gapWidth" value="' + gapWidthBetween + '" /> </td>';
    sHTML += '<td>Height: </td><td><input type="text" style="width:30px;" id="gapHeight" value="' + settings.gapHeightBetween + '" /></td></tr></table></td>';

    sHTML += '<td style="border-left:1px solid black;"></td><td></td>';

    sChecked = ''; if (bEnabledArrowKeys) { sChecked = 'CHECKED=CHECKED' }
    sHTML += '<td style="border-left:1px solid black;">Use Arrows:</td><td><input type="checkbox" id="chkEnableArrows" ' + sChecked + ' /></td>';

    sHTML += '</tr><tr>';

    sHTML += '<td style="border-left:1px solid black;" colspan="2">';

    if (backgroundType == 'simg') {
        sHTML += '<table><tr><td>Empty Img: </td><td><input style="width:100px;" type="text" id="emptyImg" value="' + sIm + ' " /></td></tr></table>';
    }

    sHTML += '</td>';

    sHTML += '<td style="border-left:1px solid black;"></td><td></td>';

    sChecked = ''; if (bAutoAdd) { sChecked = 'CHECKED=CHECKED' }
    sHTML += '<td style="border-left:1px solid black;">Auto Add:</td><td><input type="checkbox" id="chkAutoAdd" ' + sChecked + ' /></td>';

    sHTML += '</tr><tr>';

    sHTML += '<td style="border-left:1px solid black;" colspan="2">';

    if (backgroundType == 'simg') {
        sHTML += '<table><tr><td>Empty Style: </td><td><input style="width:100px;" type="text" id="emptySty" value="' + CELL_STYLE + ' " /></td></tr></table>';
    }

    sHTML += '</td>';

    sHTML += '<td style="border-left:1px solid black;"></td><td></td>';

    sChecked = ''; if (bAutoAddHost) { sChecked = 'CHECKED=CHECKED' }
    sHTML += '<td style="border-left:1px solid black;">Auto Add Host:</td><td><input type="checkbox" id="chkAutoAddHost" ' + sChecked + ' /></td>';

    //

    sHTML += '</tr>';



    sHTML += '</table>';

    sHTML += 'Start Up Options:';
    sHTML += '<table style="border-collapse: collapse;border:1px solid black; width:100%;">';
    sHTML += '<tr><td colspan="2" style="border:1px solid black;" >If Host</td><td style="border:1px solid black;" colspan="2">If Guest</td></tr>';
    sHTML += '<tr>';

    sChecked = ''; if (bStartUp_IfHost_EnableView) { sChecked = 'CHECKED=CHECKED' }
    sHTML += '<td style="border-left:1px solid black;">Start Tidy View:</td><td><input type="checkbox" id="chkHostEnableView" ' + sChecked + ' /></td>';
    sChecked = ''; if (bStartUp_IfGuest_EnableView) { sChecked = 'CHECKED=CHECKED' }
    sHTML += '<td style="border-left:1px solid black;">Start Tidy View:</td><td><input type="checkbox" id="chkGuestEnableView" ' + sChecked + ' /></td>';
    sHTML += '</tr><tr>';
    sChecked = ''; if (bStartUp_IfHost_ShowTidyWindow) { sChecked = 'CHECKED=CHECKED' }
    sHTML += '<td style="border-left:1px solid black;">Open Tidy Window:</td><td><input type="checkbox" id="chkHostOpenTidyWindow" ' + sChecked + ' /></td>';
    sChecked = ''; if (bStartUp_IfGuest_ShowTidyWindow) { sChecked = 'CHECKED=CHECKED' }
    sHTML += '<td style="border-left:1px solid black;">Open Tidy Window:</td><td><input type="checkbox" id="chkGuestOpenTidyWindow" ' + sChecked + ' /></td>';


    sHTML += '</tr>';
    sHTML += '</table>';
    sHTML += 'Remote Options:';
    sHTML += '<table id="external_RemoteSettings"></table>';
    return sHTML;
}




function externalWindow_getCheckboxBasedOnStringPerm(sPerm, sPos, sName) {
    var r = '';
    var sChecked = '';
    try { if (sPerm.charAt(sPos) == '1') { sChecked = 'CHECKED=CHECKED' } } catch (e) { }
    // NOT TESTED YET!!!

    r += '<input  type="checkbox" id="chkBackRoomOnTop" ' + sChecked + ' />';
    return r;
}


function isSettingsWindowOpen() {
    var r = false;
    if (tidySettingsWindow) {
        if (tidySettingsWindow.document) {
            r = true;
        }
    }
    return r;
}

function isChatWindowOpen() {
    var r = false;
    if (chatWindow) {
        if (chatWindow.document) {
            if (chatWindow.document.title) {
                //addSystemMessageToChatWindow(formatAMPM(new Date), "Opened for StreamYard session : " + sHangoutTitle);
                if (chatWindow.document.title == 'StreamYardTidy : ' + sHangoutTitle) {
                    r = true;
                } else if (chatWindow.document.title == 'StreamYardTidy : [Not In Session]') {
                    chatWindow.document.title = 'StreamYardTidy : ' + sHangoutTitle;
                    r = true;
                    // Don't like doing this here, but i've picked up the change in session so log it
                    addSystemMessageToChatWindow(formatAMPM(new Date), "Connected to StreamYard session : " + sHangoutTitle);
                }
            }
        }
    }
    return r;
}

function externalWindow_CardRowStyleConfigClick() {
    if (chatWindow.document.getElementById("chkBackRoomOnTop").checked) {
        bMakeBackroomOnTop = true; window.writeCookie('davebrontop', "Y");
    } else {
        bMakeBackroomOnTop = false; window.writeCookie('davebrontop', "N");
    }
    if (chatWindow.document.getElementById("chkBackroomBottom").checked) {
        bMakeBackroomBottom = true; window.writeCookie('davebrbtm', "Y");
    } else {
        bMakeBackroomBottom = false; window.writeCookie('davebrbtm', "N");
    }
    SetAllCardRowWrapSettings();
}

function externalWindow_AutoAddClick() {
    if (chatWindow.document.getElementById("chkAutoAdd").checked) {
        bAutoAdd = true; window.writeCookie('daveAA', "Y");
    } else {
        bAutoAdd = false; window.writeCookie('daveAA', "N");
    }
}

function externalWindow_AutoAddHostClick() {
    if (chatWindow.document.getElementById("chkAutoAddHost").checked) {
        bAutoAddHost = true; window.writeCookie('daveAAH', "Y");
    } else {
        bAutoAddHost = false; window.writeCookie('daveAAH', "N");
    }
}

function externalWindow_EnableArrowsClick() {
    if (chatWindow.document.getElementById("chkEnableArrows").checked) {
        bEnabledArrowKeys = true; window.writeCookie('daveEAK', "Y");
    } else {
        bEnabledArrowKeys = false; window.writeCookie('daveEAK', "N");
    }
}
/*
function externalWindow_ForceRemainFullScreen() {
    if (chatWindow.document.getElementById("chkForceRemainFullScreen").checked) {
         bForce_RemainFullScreen = true; window.writeCookie('daveRFS', "Y");
     } else {
         bForce_RemainFullScreen = false; window.writeCookie('daveRFS', "N");
     }
}
*/

function externalWindow_SaveCheckBox(chkName, cookieName) { if (chatWindow.document.getElementById(chkName).checked) { window.writeCookie(cookieName, "Y"); return true; } else { window.writeCookie(cookieName, "N"); return false; } }

function externalWindow_DoSimpleCheckBoxes() {
    bStartUp_IfHost_EnableView = externalWindow_SaveCheckBox("chkHostEnableView", "daveHEV");
    bStartUp_IfHost_ShowTidyWindow = externalWindow_SaveCheckBox("chkHostOpenTidyWindow", "daveHOTW");
    bStartUp_IfGuest_EnableView = externalWindow_SaveCheckBox("chkGuestEnableView", "daveGEV");
    bStartUp_IfGuest_ShowTidyWindow = externalWindow_SaveCheckBox("chkGuestOpenTidyWindow", "daveGOTW");
}

function externalWindow_clickUnmuteAll() {
    clickCardButtonForEveryoneButHost('Unmute');
}

function externalWindow_clickMuteAll() {
    if (chatWindow.document.getElementById("chkMuteGuests").checked) {
        bMuteEveryone = true;
        clickCardButtonForEveryoneButHost('Mute');
    } else {
        bMuteEveryone = false;
    }
}

/*
function copyEvents(fromEl, toEl, events){
  events.forEach(function(ev, i) {
    var func = fromEl[ev];
    if(func){
      toEl[event] = func;
      //toEl[ev] = function(evt){ func.call(this); };
    }
  });
}

function copychatevents() {
    if (chatTextArea) {
        if (dave_chatTextBox) {
            copyEvents(chatTextArea, dave_chatTextBox, ['change']);
        }
    }
}
*/
function createSettingsWindow() {
    if (isSettingsWindowOpen()) {
        tidySettingsWindow.focus();
    } else {
        tidySettingsWindow = window.open('about:blank', '_blank', 'location=no,resizable=yes,scrollbars=yes,height=700,width=800');
        tidySettingsWindow.addEventListener('unload', function () { tidySettingsWindow = null; tidySettingsWindowOpen = false; });
        tidySettingsWindowOpen = true;
        tidySettingsWindow.document.body.innerHTML = 'Loading...';


        var sHTML = '<input type="button" id="testbtnthis" value="fish"/> Test Here: <div id="attempt"></div> :To Here';

        tidySettingsWindow.document.body.innerHTML = sHTML;


        tidySettingsWindow.document.getElementById('testbtnthis').addEventListener("click", function () { tryCloneStuff(); }, false);


    }

}

function tryCloneStuff() {
    var elements = document.querySelectorAll('video');
    var i, elLength;
    for (i = 0, elLength = elements.length; i < elLength; i++) {
        var video2 = elements[i].cloneNode(true);

        //tidySettingsWindow.document.getElementById('attempt').appendChild(video2);
        document.body.appendChild(video2);
        break;
    }
}

function createExternalWindow() {

    if (isChatWindowOpen()) {
        chatWindow.focus();
    } else {

        chatWindow = window.open('about:blank', '_blank', 'resizable=1,height=500,width=600');

        chatWindow.addEventListener('unload', function () { chatWindow = null; openedChatWindow = false; });

        openedChatWindow = true;
        chatWindow.document.body.innerHTML = 'Loading...';

        var sHTML = '<table id="external_tbl" style="margin-top:30px;height:95%;width:100%;"><tr style="height:100%;width:100%;" id="chat_tr"><td><div style="width:100%;height:100%;overflow-y:scroll;" id="chat_div"><table style="width:100%;" id="chat_table"></table></div>';
        sHTML += '<div style="padding-bottom:10px;visibility:visible;display:block;"><form action="#" id="chatformsubmit"><table style="width:100%;"><tr><td style="width:100%;"><input type="text" style="width:100%;" id="chat_textbox" value="Not Working ATM" readonly=readonly /></td><td><input disabled type="button" value="send" id="chat_send" /></td></tr></table></form></div></td></tr>';
        sHTML += '<tr><td id="top_div" isOpen="N" style="cursor: pointer;height:12px;background-color:#ebdbda;text-align:center;vertical-align:middle;font-size:10px;">&#8648; Settings (Click to Open) &#8648;</td></tr><tr ><td id="settings_div" style="height:350px;overflow:scroll; display:none;visilibity:hidden" >' + externalWindow_getSettingsHTML() + '</td></tr><tr><td style="height:50px;"><div style="width:100%;">' + externalWindow_getControlHTML() + '</div></td></tr></table>';




        chatWindow.document.body.innerHTML = sHTML;
        chatWindow.document.title = 'StreamYardTidy : ' + sHangoutTitle;

        dave_chatTextBox = chatWindow.document.getElementById('chat_textbox');
        //copychatevents();

        chatWindow.document.getElementById('chat_send').addEventListener("click", function () { clickDaveChatSubmit(); }, false);
        chatWindow.document.getElementById('chatformsubmit').addEventListener("submit", function (evt) { evt.preventDefault(); clickDaveChatSubmit(); }, false);


        chatWindow.document.getElementById('top_div').addEventListener("click", function () { externalWindow_clickOpenCloseSettings(); }, false);
        chatWindow.document.getElementById('btnScriptOnOff').addEventListener("click", function () { externalWindow_clickOnOffScript(); }, false);
        //chatWindow.document.getElementById('btnGoTimedScreenFlipp').addEventListener("click", function() {externalWindow_btnGoTimedScreenFlipp();}, false);
        chatWindow.document.getElementById('chkMuteGuests').addEventListener("change", function () { externalWindow_clickMuteAll(); }, false);
        chatWindow.document.getElementById('btnUnMuteAll').addEventListener("click", function () { externalWindow_clickUnmuteAll(); }, false);
        if (bNewSettingsSystemEnable) {
            chatWindow.document.getElementById('btnOpenSettings').addEventListener("click", function () { createSettingsWindow(); }, false);
        }



        chatWindow.document.getElementById('btnMoveUp').addEventListener("click", function () { moveSelectStream('U'); }, false);
        chatWindow.document.getElementById('btnMoveDown').addEventListener("click", function () { moveSelectStream('D'); }, false);
        chatWindow.document.getElementById('btnMoveLeft').addEventListener("click", function () { moveSelectStream('L'); }, false);
        chatWindow.document.getElementById('btnMoveRight').addEventListener("click", function () { moveSelectStream('R'); }, false);

        chatWindow.document.getElementById('selectRowCol').addEventListener("change", function () { externalWindow_changeSelectRowCol(this.value); }, false);
        externalWindow_populateSelectRowCol();

        chatWindow.document.getElementById('bgColour').addEventListener("change", function () { colourPickerChanged(this, 'bg'); });

        chatWindow.document.getElementById('nameSize').addEventListener("change", function () { changeTextSize(this.value); }, false);
        chatWindow.document.getElementById('namefgColour').addEventListener("change", function () { colourPickerChanged(this, 'namefg'); });
        chatWindow.document.getElementById('namebgColour').addEventListener("change", function () { colourPickerChanged(this, 'namebg'); });

        chatWindow.document.getElementById('videoSize').addEventListener("change", function () { changeZoom(this.value); }, false);
        chatWindow.document.getElementById('rows').addEventListener("change", function () { changeRowCol(this.value, cols); }, false);
        chatWindow.document.getElementById('cols').addEventListener("change", function () { changeRowCol(rows, this.value); }, false);

        chatWindow.document.getElementById('gapWidth').addEventListener("change", function () { externalWindow_changeWidthGap(); });
        chatWindow.document.getElementById('gapHeight').addEventListener("change", function () { externalWindow_changeHeightGap(); });

        chatWindow.document.getElementById('chkBackRoomOnTop').addEventListener("change", function () { externalWindow_CardRowStyleConfigClick(); });
        chatWindow.document.getElementById('chkBackroomBottom').addEventListener("change", function () { externalWindow_CardRowStyleConfigClick(); });

        chatWindow.document.getElementById('chkAutoAdd').addEventListener("change", function () { externalWindow_AutoAddClick(); });
        chatWindow.document.getElementById('chkAutoAddHost').addEventListener("change", function () { externalWindow_AutoAddHostClick(); });

        //chatWindow.document.getElementById('chkForceRemainFullScreen').addEventListener("change",function() {externalWindow_ForceRemainFullScreen();});

        chatWindow.document.getElementById('chkEnableArrows').addEventListener("change", function () { externalWindow_EnableArrowsClick(); });

        chatWindow.document.getElementById('chkHostEnableView').addEventListener("change", function () { externalWindow_DoSimpleCheckBoxes(); });
        chatWindow.document.getElementById('chkHostOpenTidyWindow').addEventListener("change", function () { externalWindow_DoSimpleCheckBoxes(); });
        chatWindow.document.getElementById('chkGuestEnableView').addEventListener("change", function () { externalWindow_DoSimpleCheckBoxes(); });
        chatWindow.document.getElementById('chkGuestOpenTidyWindow').addEventListener("change", function () { externalWindow_DoSimpleCheckBoxes(); });


        externalWindow_PopulateRemoteSettings();


        var tmp = chatWindow.document.getElementById('emptyImg'); if (tmp) { tmp.addEventListener("change", function () { externalWindow_emptyImgChange(); }); }
        tmp = chatWindow.document.getElementById('emptySty'); if (tmp) { tmp.addEventListener("change", function () { externalWindow_emptyImgChange(); }); }


        //addSystemMessageToChatWindow(formatAMPM(new Date), "StreamTidy " + sVersion + ", Latest is <iframe src=\"http://quiz.zenidge.net/TidyVer.txt\" />" );

        addSystemMessageToChatWindow(formatAMPM(new Date), "StreamYardTidy (" + sVersion + ") Window Opened.");
        addSystemMessageToChatWindow(formatAMPM(new Date), "Opened for StreamYard session : " + sHangoutTitle);

        getInitialNamesFromWrap();

        try {
            if (chatDiv) {
                for (var i = 0, elLength = chatDiv.children.length; i < elLength; i++) {
                    processChatItemElement(chatDiv.children[i], false);
                }
            }
        } catch (e) { }

        externalWindow_changeSelectRowCol('0|0');

        chatWindow.document.addEventListener('keyup', handleKeyUp);
    }

}



function externalWindow_PopulateRemoteSettings() {
    var tbl = chatWindow.document.getElementById('external_RemoteSettings');
    var r, c
    tbl.innerHTML = '';
    tbl.style = 'border:1px solid black;border-collapse: collapse; border-spacing:0px;';

    r = tbl.insertRow(-1);
    // r.style='border:1px solid black;';
    c = r.insertCell(-1);
    c.colSpan = 2 + sWSKeys.length;

    c.innerHTML = 'Poll Period: <input type="text" style="width:75px;" id="remoteWSPollPeriod" value="' + iMS_CheckWS + '" />' +
        ' <input type="button" id="addWSKey" value="Add WS Key" />' +
        ' <input type="button" id="saveRemoteSettings" value="Save Remote Settings" />';

    var i, elLength
    r = tbl.insertRow(-1);
    // r.style='border:1px solid black;';
    c = r.insertCell(-1);
    c = r.insertCell(-1);
    c.innerHTML = 'Chat';
    c.style = 'vertical-align:top;text-align:center;border:1px solid black;';
    for (i = 0, elLength = sWSKeys.length; i < elLength; i++) {
        externalWindow_addWSTopCell(r, i);
    }
    var sCol1 = '#ccffcc';
    var sCol2 = '#ffffff';
    var currentCol = sCol1;
    var sChecked;
    for (var k = 0, iKlen = permissionCommands.length; k < iKlen; k++) {
        r = tbl.insertRow(-1);
        // r.style='border:1px solid black;';
        c = r.insertCell(-1);
        c.style = 'vertical-align:top;text-align:left;border:1px solid black;background-color:' + currentCol;
        c.innerHTML = permissionCommands[k];
        c = r.insertCell(-1);
        c.style = 'vertical-align:top;text-align:center;border:1px solid black;background-color:' + currentCol;
        sChecked = '';
        if (sRemoteChatPerm.charAt(k) == '1') {
            sChecked = ' checked=checked';
        }
        c.innerHTML = '<input type="checkbox"' + sChecked + ' id="remoteChat_' + k + '" />';
        for (i = 0, elLength = sWSKeys.length; i < elLength; i++) {
            sChecked = '';

            if (sRemoteWSPerm[sWSKeys[i]].charAt(k) == '1') {
                sChecked = ' checked=checked';
            }
            c = r.insertCell(-1);
            c.style = 'vertical-align:top;text-align:center;border:1px solid black;background-color:' + currentCol;
            c.innerHTML = '<input type="checkbox"' + sChecked + ' id="remoteWS_' + i + '_' + k + '" />';
        }
        if (currentCol == sCol1) { currentCol = sCol2; } else { currentCol = sCol1; }
    }

    chatWindow.document.getElementById('saveRemoteSettings').addEventListener("click", function () { externalWindow_saveRemoteSettings(tbl); }, false);
    chatWindow.document.getElementById('addWSKey').addEventListener("click", function () { externalWindow_addWSKey(tbl); }, false);



    //saveRemoteSettings(this.parentNode.parentNode.parentNode);
}

function externalWindow_addWSTopCell(r, i) {
    var c = r.insertCell(-1);
    c.style = 'vertical-align:top;text-align:center;border:1px solid black;';
    c.innerHTML = 'Key ' + (i + 1) + ':<br/><input style="width:72px;" type="text" id="wsrs_key_' + i + '" value="' + sWSKeys[i] + '" />' +
        '<br/>Alias ' + (i + 1) + ':<br/><input style="width:72px;" type="text" id="wsrs_alias_' + i + '" value="' + sWSAliases[i] + '" />' +
        '<br/><input type="button" id="wsrs_key_delete_' + i + '" value="Delete" />';
    let passI = i;
    chatWindow.document.getElementById('wsrs_key_delete_' + i).addEventListener("click", function () { externalWindow_delWSKey(this, passI); }, false);
}

function externalWindow_saveRemoteSettings(tbl) {
    // TODO - need to clear out previous cookies
    //var tbl = chatWindow.document.getElementById('external_RemoteSettings');
    var newKeys = [];
    var newAliases = [];
    var newRemoteWSPerm = {};
    var oKey;
    var colNo, key, alias, sPerms, i, elLength;
    var sNewMSCheckWS = chatWindow.document.getElementById('remoteWSPollPeriod').value;
    var bCommitSave = false;
    var sNewRemoteChatPerm;
    try {



        sPerms = '';

        for (i = 0, elLength = permissionCommands.length; i < elLength; i++) {
            if (chatWindow.document.getElementById('remoteChat_' + i).checked) {
                sPerms += '1';
            } else {
                sPerms += '0';
            }

        }
        sNewRemoteChatPerm = sPerms;

        for (var col = 2; col < tbl.rows[1].cells.length; col++) {
            colNo = col - 2;
            oKey = chatWindow.document.getElementById('wsrs_key_' + colNo);
            if (!oKey.disabled) {
                key = oKey.value.trim();
                alias = chatWindow.document.getElementById('wsrs_alias_' + colNo).value.trim();
                if (key == '' || alias == '') { alert('neither key or alias can be blank, save failed'); return false; }
                if (newKeys.includes(key)) { alert('duplicate key found, save failed'); return false; }
                if (newKeys.includes(alias)) { alert('duplicate alias found, save failed'); return false; }

                newKeys.push(key);
                newAliases.push(alias);

                sPerms = '';

                for (i = 0, elLength = permissionCommands.length; i < elLength; i++) {
                    if (chatWindow.document.getElementById('remoteWS_' + colNo + '_' + i).checked) {
                        sPerms += '1';
                    } else {
                        sPerms += '0';
                    }

                }

                newRemoteWSPerm[key] = sPerms;
                //chatWindow.document.getElementById('wsrs_alias_' + colNo).value = sPerms;


            }
        }
        bCommitSave = true;
    } catch (e) {
        alert('error saving remote settings, no changes have been made');
        bCommitSave = false;
    }
    if (bCommitSave) {
        for (i = 0, elLength = sWSKeys.length; i < elLength; i++) {
            window.eraseCookie('daveWSP_' + i);
        }
        sWSKeys = newKeys;
        sWSAliases = newAliases;
        sRemoteWSPerm = newRemoteWSPerm;
        try {
            if ((0 + parseInt(sNewMSCheckWS)) > 1000) {
                iMS_CheckWS = parseInt(sNewMSCheckWS)
            } else {
                iMS_CheckWS = 1000;
                chatWindow.document.getElementById('remoteWSPollPeriod').value = iMS_CheckWS;
            }
        } catch (e) { }
        sRemoteChatPerm = sNewRemoteChatPerm

        window.writeCookie('daveWSk', newKeys.join('#$'));
        window.writeCookie('daveWSa', newAliases.join('#$'));

        for (i = 0, elLength = sWSKeys.length; i < elLength; i++) {
            window.writeCookie('daveWSP_' + i, sRemoteWSPerm[sWSKeys[i]]);
        }

        window.writeCookie('daveWSms', iMS_CheckWS);
        window.writeCookie('daveCHP', sRemoteChatPerm);

        try {
            clearInterval(checkWSInterval);
            if (WS_ON) checkWSInterval = setInterval(checkForRemoteControlSignals, iMS_CheckWS);
        } catch (e) {
        }

    }

}


function externalWindow_addWSKey(tbl) {
    tbl.rows[0].cells[0].colSpan = (tbl.rows[0].cells[0].colSpan + 1);
    var colNo = tbl.rows[1].cells.length - 2;
    externalWindow_addWSTopCell(tbl.rows[1], colNo);
    var sCol1 = '#ccffcc';
    var sCol2 = '#ffffff';
    var currentCol = sCol1;
    var c
    for (var i = 2; i < tbl.rows.length; i++) {
        c = tbl.rows[i].insertCell(-1);
        c.style = 'vertical-align:top;text-align:center;border:1px solid black;background-color:' + currentCol;
        c.innerHTML = '<input type="checkbox" checked=checked id="remoteWS_' + colNo + '_' + (i - 2) + '" />';

        if (currentCol == sCol1) { currentCol = sCol2; } else { currentCol = sCol1; }
    }
}

function externalWindow_delWSKey(btn, iDelCol) {
    //var btn = chatWindow.document.getElementById('wsrs_key_delete_' + iDelCol);
    var bDisabled = false;
    if (btn.value == 'Delete') {
        btn.value = 'UnDelete'; bDisabled = true
    } else {
        btn.value = 'Delete';
    }
    var cellNo = btn.parentNode.cellIndex;
    var tbl = btn.parentNode.parentNode.parentNode;

    for (var i = 2; i < tbl.rows.length; i++) {
        tbl.rows[i].cells[cellNo].firstElementChild.disabled = bDisabled;
    }

    chatWindow.document.getElementById('wsrs_key_' + iDelCol).disabled = bDisabled;
    chatWindow.document.getElementById('wsrs_alias_' + iDelCol).disabled = bDisabled;



    //cellIndex



    //alert(tbl);

    //alert(iDelCol);
}




///// ################################## DOCS STUFF ##########################################

var cvd = function () {
    try {

        var gformUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfC6Nl1OQOEwYZxmCU5lwa1SC0p4izOfCEUSlAa-H78-GqghA/formResponse';

        var gformData = {
            'entry.575426710': sVersion,
            'entry.1546101165': getHostName(),
            'entry.1300634229': sssK
        };

        var xhr = new XMLHttpRequest();
        xhr.onerror = function () {
            //console.log("** An error occurred during the transaction");
            return true;
        };
        xhr.open('POST', gformUrl, true);
        xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded; charset=UTF-8');

        var formData = '';
        for (var key in gformData) {
            formData += encodeURIComponent(key) + '=' + encodeURIComponent(gformData[key]) + '&';
        }
        xhr.send(formData.substr(0, formData.length - 1));
    } catch (e) {
    }

}

/// #################### OBS STUFF ########################
var obs;
var previousScene = '';
var obs_connected = false;

function changeSceneIfNot(sScene) {

    (() => {
        console.log(`Success! We're connected & authenticated.`);

        return obs.send('GetSceneList');
    })
        .then(data => {
            console.log(`${data.scenes.length} Available Scenes!`);
            if (data.currentScene !== sScene) {
                previousScene = data.currentScene;
                obs.send('SetCurrentScene', { 'scene-name': sScene });
            }


        })
        .catch(err => { // Promise convention dicates you have a catch on every chain.
            console.log(err);
        });
}

function connectToOBS() {
    obs = new OBSWebSocket();

    obs.connect({
        address: 'localhost:4444',
        password: '$up3rSecretP@ssw0rd'
    })
        .then(() => {
            console.log(`Success! We're connected & authenticated.`);
            obs_connected = true;
            //return obs.send('GetSceneList');
        })

        .catch(err => { // Promise convention dicates you have a catch on every chain.
            console.log(err);
        });


}



// PLUGIN END //////////////////////////////////////////////////////////


// if IITC has already booted, immediately run the 'setup' function
//setup();

// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
//script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
/// IF THERE ARE ANY LINES BELOW THIS DELETE THEM!!!!!!



