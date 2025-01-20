function startScript() {
    wwr_req_recur("TRANSPORT;BEATPOS", 10);
    wwr_req_recur("NTRACK;TRACK;GET/40364;GET/1157;GET/41819", 10);
    wwr_req_recur("MARKER;REGION", 500);
    wwr_start();
    window.addEventListener('resize', calculateScale, false);
    jogger = document.getElementById("jogger");
    joggerWidth = jogger.getBoundingClientRect()["width"];
    jogger.addEventListener("mousedown", joggerHandler, false);
    jogger.addEventListener('touchstart', function (event) {
        if (event.touches.length > 0) joggerHandler(event);
        event.preventDefault();
        }, false);

    transitionsButton = document.getElementById("transitionsButton");
    if (transitionsButton) {
        doTransitionButton();
        transitionsButton.onclick = function () {
            transitions ^= 1;
            doTransitionButton();
        }
    }
    
}



var last_transport_state = -1, mouseDown = 0, last_time_str = "",
    last_metronome = false, nTrack = 0, last_repeat = false, snapState = 0, prerollState =0,
    drawnSig = 0, drawnBeat = 0, ts_numerator = 0, ts_denominator = 0, playPosSeconds = 0, statusPosition = [], statusPositionAr = [],
    startX = 0, joggerAgg = 0, recarmCountAr = [], recarmCount = 0, newPos = -1,
    trackHeightsAr = [], trackColoursAr = [], trackNumbersAr = [], trackNamesAr = [], trackVolumeAr = [],
    trackFlagsAr = [], trackSendCntAr = [], trackRcvCntAr = [], trackHwOutCntAr = [], trackSendHwCntAr = [], trackPeakAr = [], trackMeterAr = [], faderConAr = [],
    hereCss = document.styleSheets[1], transitions = 1;

var thisSendTrackId = 0, sendOutputdB = 0;
var scaleFactor = 1, optionsOpen = 0;
var transitionsButton = undefined;

var jogger = undefined;
var joggerWidth = undefined;
var requestAnimationFrame = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;

trackHeightsAr[0] = 0;
w3IncludeHTML(startScript);

function openTab(tabId) {
    var i;
    var x = document.getElementsByClassName("tab-element");
    for (i = 0; i < x.length; i++) {
      x[i].style.display = "none";
    }
    document.getElementById(tabId).style.display = "block";
  }

function setTextForObject(obj, text) {
    if (obj.lastChild) obj.lastChild.nodeValue = text;
    else obj.appendChild(document.createTextNode(text));
}

function lumaOffset(c) {
    var c = c.substring(1);
    var rgb = parseInt(c, 16);
    var r = (rgb >> 16) & 0xff;
    var g = (rgb >> 8) & 0xff;
    var b = (rgb >> 0) & 0xff;
    var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }
    if (luma < 150) { r = r + 150; g = g + 150; b = b + 150 }
    if (luma > 150) { r = r - 120; g = g - 120; b = b - 120 }
    if (r < 0) { r = 0 }; if (g < 0) { g = 0 }; if (b < 0) { b = 0 }
    if (r > 255) { r = 255 }; if (g > 255) { g = 255 }; if (b > 255) { b = 255 }
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function mouseDownEventHandler(msg) {
    return function (e) {
        if (typeof e == 'undefined') e = event;
        if (e.preventDefault) e.preventDefault();
        wwr_req(msg);
        return false;
    }
}

function mouseUpHandler(event) { mouseDown = 0; }
function mouseDownHandler(event, target) { mouseDown = 1; }
function mouseLeaveHandler(event) { mouseDown = 0; }
function mouseMoveHandler(event) {
    if (mouseDown != 1) { return; }
    else {
        var volTrackWidth = (this.getBoundingClientRect()["width"]);
        var volThumbWidth = volTrackWidth * 0.14375;
        var volThumbTrackWidth = (volTrackWidth - volThumbWidth);
        var volThumbTrackLEdge = this.getBoundingClientRect()["left"];
        offsetX = (event.pageX - volThumbTrackLEdge - (volThumbWidth / 2));

        if (event.changedTouches != undefined) { //we're doing touch stuff
            offsetX = (event.changedTouches[0].pageX - volThumbTrackLEdge - (volThumbWidth / 2));
        }
        if (offsetX < 0) { offsetX = 0 };
        if (offsetX > volThumbTrackWidth) { offsetX = volThumbTrackWidth };

        var volThumb = this.firstChild.getElementsByClassName("fader")[0];
        var offsetX320 = offsetX * (320 / volTrackWidth);
        var vteMove320 = "translate(" + offsetX320 + " 0)";
        volThumb.setAttributeNS(null, "transform", vteMove320);
        var volOutput = (offsetX / volThumbTrackWidth);
        var volOutputdB = Math.pow(volOutput, 4) * 4;
        wwr_req("SET/TRACK/" + this.id + "/VOL/" + volOutputdB)
    }
}



function sendMouseMoveHandler(event) {
    if (mouseDown != 1) { return; }
    else {
        var sendTrackWidth = this.getElementsByClassName("sendBg")[0].getBoundingClientRect()["width"];
        var sendThumbWidth = this.getElementsByClassName("sendBg")[0].getBoundingClientRect()["height"];
        var sendThumbTrackWidth = (sendTrackWidth - sendThumbWidth);
        var sendThumbTrackLEdge = this.getElementsByClassName("sendBg")[0].getBoundingClientRect()["left"];

        offsetX = event.pageX - sendThumbTrackLEdge - (sendThumbWidth / 2);
        if (event.changedTouches != undefined) { //we're doing touch stuff
            offsetX = (event.changedTouches[0].pageX - sendThumbTrackLEdge - (sendThumbWidth / 2));
        }
        if (offsetX < 0) { offsetX = 0 };
        if (offsetX > sendThumbTrackWidth) { offsetX = sendThumbTrackWidth };

        var offsetX262 = offsetX * (262 / sendTrackWidth) + 26;
        var sendThumb = this.getElementsByClassName("sendThumb")[0];
        sendThumb.setAttributeNS(null, "cx", offsetX262);
        var sendLine = this.getElementsByClassName("sendLine")[0];
        sendLine.setAttributeNS(null, "x2", offsetX262);

        var sendOutput = (offsetX / sendThumbTrackWidth);
        sendOutputdB = Math.pow(sendOutput, 4) * 4;
        thisSendTrackId = (this.parentNode.id).slice(10);
        wwr_req("SET/TRACK/" + thisSendTrackId + "/SEND/" + this.id + "/VOL/" + sendOutputdB)
    }
}

function volFaderConect(content, thumb) {
    content.addEventListener("mousemove", mouseMoveHandler, false);
    content.addEventListener("touchmove", mouseMoveHandler, false);
    content.addEventListener("mouseleave", mouseLeaveHandler, false);
    content.addEventListener("mouseup", mouseUpHandler, false);
    content.addEventListener("touchend", mouseUpHandler, false);
    thumb.addEventListener("mousedown", function (event) { mouseDownHandler(event, event.srcElement) }, false);
    thumb.addEventListener('touchstart', function (event) {
        if (event.touches.length > 0) mouseDownHandler(event, event.srcElement);
        event.preventDefault();
    }, false);
}

function sendMouseUpHandler(event) {
    wwr_req("SET/TRACK/" + thisSendTrackId + "/SEND/" + this.id + "/VOL/" + sendOutputdB + "e");
    mouseDown = 0;
}

function elAttribute(id, attribute, value) {
    if (document.getElementById(id)) {
        document.getElementById(id).setAttributeNS(null, attribute, value);
    }
}


function wwr_onreply(results) {
    /*var resultsDisplay = document.getElementById("_results");
     if(resultsDisplay!=null){
         var _backLoaded = document.getElementById("backLoad");
         _backLoaded.style.display = "block";
         resultsDisplay.innerHTML = results;
         } */

    var ar = results.split("\n");
    for (var x = 0; x < ar.length; x++) {
        var tok = ar[x].split("\t");
        if (tok.length > 0) switch (tok[0]) {
            case "TRANSPORT":
                if (tok.length > 4) {
                    var backLoaded = document.getElementById("backLoad");
                    if (backLoaded != null) {
                        if (tok[1] != last_transport_state) {
                            last_transport_state = tok[1];
                            document.getElementById("playButtonOff").style.visibility = (last_transport_state & 1) ? "hidden" : "visible";
                            document.getElementById("playButtonOn").style.visibility = (last_transport_state & 1) ? "visible" : "hidden";
                            document.getElementById("pauseButtonOff").style.visibility = (last_transport_state & 2) ? "hidden" : "visible";
                            document.getElementById("pauseButtonOn").style.visibility = (last_transport_state & 2) ? "visible" : "hidden";
                            document.getElementById("record_off").style.visibility = (last_transport_state & 4) ? "hidden" : "";
                            document.getElementById("record_on").style.visibility = (last_transport_state & 4) ? "visible" : "";
                            document.getElementById("armed_text").style.visibility = (last_transport_state & 4) ? "hidden" : "";
                            document.getElementById("armed_count").style.visibility = (last_transport_state & 4) ? "hidden" : "";
                            document.getElementById("abort_text").style.visibility = (last_transport_state & 4) ? "visible" : "";
                            document.getElementById("abort_cross").style.visibility = (last_transport_state & 4) ? "visible" : "";
                        }
                        if (tok[3] != last_repeat) {
                            last_repeat = tok[3];
                            document.getElementById("repeat_off").style.visibility = (last_repeat > 0) ? "hidden" : "";
                            document.getElementById("repeat_on").style.visibility = (last_repeat > 0) ? "visible" : "";
                        }
                        var statusDisplay = document.getElementById("status");

                        //make an array of the current position and its unit
                        statusPosition[0] = tok[4];
                        statusPositionAr = tok[4].split(".");
                        if (statusPositionAr[1] == undefined) {
                            if (statusPositionAr[0].match(":")) { statusPosition[1] = "Hours:Minutes:Seconds:Frames"; }
                            else { statusPosition[1] = "samples / frames"; }
                        }
                        else {
                            if (statusPositionAr[1].length == 3) {
                                if (statusPositionAr[0].match(":")) { statusPosition[1] = "Minutes:Seconds"; }
                                else { statusPosition[1] = "Seconds"; }
                            }
                            else { statusPosition[1] = "Measures.Beats"; }
                        }
                        document.getElementById("timeUnits").textContent = statusPosition[1];

                        joggerAggSign = Math.sign(joggerAgg);
                        if (joggerAgg != 0) {
                            var joggerAggExp = Math.exp(Math.abs(joggerAgg)) * Math.sign(joggerAgg);
                            if (statusPosition[1] == "Measures.Beats") {
                                statusJogging = BtoMB(Math.floor(Math.exp(Math.abs(joggerAgg)))) * Math.sign(joggerAgg) + ".00";
                            }
                            else { statusJogging = joggerAggExp.toPrecision(4) + " s"; }
                            statusDisplay.textContent = statusJogging;
                            statusDisplay.style.fill = (joggerAggSign < 0) ? "#FE003B" : "#00FE95";
                        }
                        else {
                            statusDisplay.textContent = statusPosition[0];
                            statusDisplay.style.fill = "#a8a8a8";
                        }
                        if (tok[2] != playPosSeconds) { playPosSeconds = tok[2]; }
                    }
                    last_time_str = tok[4];
                }
                break;
            case "CMDSTATE":
                // console.log(tok[1])
                var buttonMetro = document.getElementById("buttonMetro");
                if (tok[1] == 40364 && buttonMetro) {
                    if (last_metronome == 1) {
                        buttonMetro.childNodes[3].setAttributeNS(null, "visibility", "visible");
                        buttonMetro.childNodes[7].setAttributeNS(null, "visibility", "hidden");
                    }
                    else {
                        buttonMetro.childNodes[3].setAttributeNS(null, "visibility", "hidden");
                        buttonMetro.childNodes[7].setAttributeNS(null, "visibility", "visible");
                    }
                    last_metronome = tok[2];
                }
                var buttonSnap = document.getElementById("buttonSnap");
                if (tok[1] == 1157 && buttonSnap) {
                    if (tok[2] != snapState) {
                        if (snapState == 0) {
                            buttonSnap.childNodes[3].setAttributeNS(null, "visibility", "visible");
                            buttonSnap.childNodes[7].setAttributeNS(null, "visibility", "hidden");
                        }
                        else {
                            buttonSnap.childNodes[3].setAttributeNS(null, "visibility", "hidden");
                            buttonSnap.childNodes[7].setAttributeNS(null, "visibility", "visible");
                        }
                        snapState = tok[2];
                    }
                }
                var prerollButton = document.getElementById("prerollButton");
                
                if (tok[1] == 41819 && prerollButton) {
                    // console.log(prerollButton)
                    if (tok[2] != prerollState) {
                        if (prerollState == 0) {
                            prerollButton.childNodes[3].setAttributeNS(null, "visibility", "visible");
                            prerollButton.childNodes[7].setAttributeNS(null, "visibility", "hidden");
                        }
                        else {
                            prerollButton.childNodes[3].setAttributeNS(null, "visibility", "hidden");
                            prerollButton.childNodes[7].setAttributeNS(null, "visibility", "visible");
                        }
                        prerollState = tok[2];
                    }
                }
                break;
            case "BEATPOS":
                var playLine = document.querySelector('#playLine');
                if (tok.length > 5 && playLine) {
                    var playLineCirc = 301.1;
                    var playLineArc = playLineCirc - (playLineCirc / tok[6]);
                    //var playLineRotate = (360 / tok[6]) * tok[5]; //freewheeling play line
                    thisBeat = Math.round(tok[5]);
                    var playLineRotate = (360 / tok[6]) * thisBeat;
                    thisSig = tok[6];
                    if (drawnSig != thisSig || drawnBeat != thisBeat && playLine) {
                        playLine.setAttributeNS(null, "stroke-dasharray", playLineCirc);
                        playLine.setAttributeNS(null, "stroke-dashoffset", playLineArc);
                        playLine.setAttribute("transform", "rotate(" + playLineRotate + ",151.8,52.4)");
                    }
                    ts_numerator = tok[6];
                    ts_denominator = tok[7];
                    document.getElementById("tsNum").textContent = ts_numerator;
                    document.getElementById("tsDen").textContent = ts_denominator;
                }
                break;

            case "REGION_LIST":
                g_regions = [];
                break;
            case "REGION":
                g_regions.push(tok);
                break;
            case "MARKER_LIST":
                g_markers = [];
                break;
            case "MARKER":
                g_markers.push(tok);
                break;
            case "MARKER_LIST_END":
                var pos = parseFloat(playPosSeconds);
                var previ = -1, thisi = -1, nexti = -1;
                break;

            case "REGION_LIST_END":

                //assemble mrMap array : time, marker number, region start number, region end number.
                for (var i = 0; i < g_regions.length; i++) {
                    if (g_regions[i][5] == 0) { g_regions[i][5] = 25198720; } // Give uncoloured regions a colour.
                }
                for (var i = 0; i < g_markers.length; i++) {
                    if (g_markers[i][4] == 0) { g_markers[i][4] = 25198720; } // Give uncoloured markers a colour.
                }
                var mrMapAr = [];
                for (var i = 0; i < g_regions.length * 2; i++) {
                    mrMapAr[i] = [];
                    if (i < g_regions.length) {                             //add the region starts to the ar
                        mrMapAr[i][0] = g_regions[i][3];
                        mrMapAr[i][2] = g_regions[i][2];
                    }
                    else {                                               //add the region ends to the ar
                        mrMapAr[i][0] = g_regions[i - g_regions.length][4];
                        mrMapAr[i][3] = g_regions[i - g_regions.length][2];
                    }
                }
                for (var i = 0; i < g_markers.length; i++) {                //add the markers to the ar
                    mrMapAr[i + (g_regions.length * 2)] = [];
                    mrMapAr[i + (g_regions.length * 2)][0] = g_markers[i][3];
                    mrMapAr[i + (g_regions.length * 2)][1] = g_markers[i][2];
                }

                for (var i = 0; i < mrMapAr.length; i++) {                  //prep times for sorting
                    posToSix = parseFloat(mrMapAr[i][0]).toFixed(6);
                    mrMapAr[i][0] = parseFloat(posToSix);
                }

                mrMapAr.sort(function (a, b) {                           //sort into time order
                    return (a[0] === b[0] ? 0 : (a[0] < b[0] ? -1 : 1));
                });

                function mergeAt(idx) {
                    if (mrMapAr[i - 1][idx]) { a = mrMapAr[i - 1][idx] } else { a = 0 };
                    if (mrMapAr[i][idx]) { b = mrMapAr[i][idx] } else { b = 0 };
                    mrMapAr[i - 1][idx] = parseFloat(a) + parseFloat(b);
                }

                var mergeDone = 0;
                for (var i = 1; i < mrMapAr.length; i++) {                  //merge cells if at same time, delete the duplicate
                    if (mrMapAr[i - 1] && mrMapAr[i][0] === mrMapAr[i - 1][0]) {
                        mergeAt(1); mergeAt(2); mergeAt(3);
                        mrMapAr.splice(i, 1);
                    }
                    if (i == (mrMapAr.length - 1)) { mergeDone = 1 }
                }

                var prevl = -1, thisl = -1, nextl = -1;
                if (mergeDone == 1) {
                    for (var i = 0; i < mrMapAr.length; i++) {
                        var diff = (mrMapAr[i][0] - pos);
                        if (diff < 0) {
                            if (i > prevl) { prevl = i }
                        }
                        if (diff == 0) { thisl = i };
                        if (diff > 0) {
                            if (i > nextl) { nextl = i; break; }
                        }
                    }
                }

                function getValuesFromId(array, id, colourIdx) {
                    for (var i = 0, len = array.length; i < len; i++) {
                        if (array[i][2] == id) { return [id, (array[i][1]), (array[i][colourIdx])] }
                    }
                    return [0, 0, 0];
                }

                var nextPrevSvg = document.getElementById("nextPrev")
                if ((pos != newPos || mrMapAr.length != newMrMapLength) && mergeDone == 1 && nextPrevSvg) {
                    var rIdxAsg = [];
                    search: for (i = 0; i < 4; i++) {                         // 4 is the maximum drawable number of regions
                        if (mrMapAr[prevl] && mrMapAr[prevl][3] >= 1) {               //region end at prev?
                            var q = parseFloat(mrMapAr[prevl][3]);
                            if (rIdxAsg.indexOf(q) == -1) { rIdxAsg[i] = q; continue search; }
                        }
                        if (mrMapAr[prevl] && mrMapAr[prevl][2] >= 1) {               //region start at prev?
                            var q = parseFloat(mrMapAr[prevl][2]);
                            if (rIdxAsg.indexOf(q) == -1) { rIdxAsg[i] = q; continue search; }
                        }
                        if (mrMapAr[thisl] && mrMapAr[thisl][3] >= 1) {               //region end at this?
                            var q = parseFloat(mrMapAr[thisl][3]);
                            if (rIdxAsg.indexOf(q) == -1) { rIdxAsg[i] = q; continue search; }
                        }
                        if (mrMapAr[thisl] && mrMapAr[thisl][2] >= 1) {               //region start at this?
                            var q = parseFloat(mrMapAr[thisl][2]);
                            if (rIdxAsg.indexOf(q) == -1) { rIdxAsg[i] = q; continue search; }
                        }
                        if (mrMapAr[nextl] && mrMapAr[nextl][3] >= 1) {               //region end at next?
                            var q = parseFloat(mrMapAr[nextl][3]);
                            if (rIdxAsg.indexOf(q) == -1) { rIdxAsg[i] = q; continue search }
                        }
                        if (mrMapAr[nextl] && mrMapAr[nextl][2] >= 1) {               //region start at next?
                            var q = parseFloat(mrMapAr[nextl][2]);
                            if (rIdxAsg.indexOf(q) == -1) { rIdxAsg[i] = q; }
                        }
                    }

                    function getValFromAr(array, id, idLoc, valLoc) {
                        for (var i = 0, len = array.length; i < len; i++) {
                            if (array[i][idLoc] == id) { return array[i][valLoc]; }
                        }
                        return;
                    }

                    for (i = 1; i < 5; i++) {
                        this['r' + i + 'StalkLx'] = 45.6;
                        this['r' + i + 'StalkRx'] = 273.1;
                        if (rIdxAsg[i - 1] && rIdxAsg[i - 1] >= 0) {
                            this['r' + i + 'Idx'] = rIdxAsg[i - 1];
                            this['r' + i + 'Name'] = getValFromAr(g_regions, rIdxAsg[i - 1], 2, 1);
                            this['col' + i] = getValFromAr(g_regions, rIdxAsg[i - 1], 2, 5);
                            this['rCol' + i] = "#" + (this['col' + i] | 0x1000000).toString(16).substr(-6);
                            if (prevl >= 0 && mrMapAr[prevl][3] == rIdxAsg[i - 1]) { this['r' + i + 'StalkRx'] = 102.5; }
                            if (prevl >= 0 && mrMapAr[prevl][2] == rIdxAsg[i - 1]) { this['r' + i + 'StalkLx'] = 102.5; }
                            if (thisl >= 0 && mrMapAr[thisl][2] == rIdxAsg[i - 1]) { this['r' + i + 'StalkLx'] = 159.4; }
                            if (thisl >= 0 && mrMapAr[thisl][3] == rIdxAsg[i - 1]) { this['r' + i + 'StalkRx'] = 159.4; }
                            if (nextl >= 0 && mrMapAr[nextl][2] == rIdxAsg[i - 1]) { this['r' + i + 'StalkLx'] = 216.2; }
                            if (nextl >= 0 && mrMapAr[nextl][3] == rIdxAsg[i - 1]) { this['r' + i + 'StalkRx'] = 216.2; }
                            document.getElementById('region' + i).setAttributeNS(null, "visibility", "visible");
                            document.getElementById('r' + i + 'Rect').setAttributeNS(null, "fill", this['rCol' + i]);
                            document.getElementById('r' + i + 'StalkL').setAttributeNS(null, "x1", this['r' + i + 'StalkLx']);
                            document.getElementById('r' + i + 'StalkL').setAttributeNS(null, "x2", this['r' + i + 'StalkLx']);
                            document.getElementById('r' + i + 'StalkR').setAttributeNS(null, "x1", this['r' + i + 'StalkRx']);
                            document.getElementById('r' + i + 'StalkR').setAttributeNS(null, "x2", this['r' + i + 'StalkRx']);
                            this['r' + i + 'RectW'] = (this['r' + i + 'StalkRx']) - (this['r' + i + 'StalkLx']);
                            document.getElementById('r' + i + 'Rect').setAttributeNS(null, "x", this['r' + i + 'StalkLx']);
                            document.getElementById('r' + i + 'Rect').setAttributeNS(null, "width", this['r' + i + 'RectW']);
                            if (!this['r' + i + 'Name']) { this['r' + i + 'Name'] = this['r' + i + 'Idx'] }
                            document.getElementById('r' + i + 'Name').textContent = this['r' + i + 'Name'];
                            document.getElementById('r' + i + 'Name').setAttributeNS(null, "fill", lumaOffset(this['rCol' + i]));
                            this['r' + i + 'NamePos'] = this['r' + i + 'StalkLx'] + ((this['r' + i + 'StalkRx'] - this['r' + i + 'StalkLx']) / 2);
                            document.getElementById('r' + i + 'Name').setAttributeNS(null, "transform", "matrix(1 0 0 1 " + this['r' + i + 'NamePos'] + " 31)");
                        }
                        else { document.getElementById('region' + i).setAttributeNS(null, "visibility", "hidden"); }
                    }

                    if (mrMapAr[prevl] && mrMapAr[prevl][1] >= 1) {
                        var mPrevIdx = mrMapAr[prevl][1];
                        var mPrevName = getValFromAr(g_markers, mPrevIdx, 2, 1);
                        var mPrevCol = getValFromAr(g_markers, mPrevIdx, 2, 4);
                        mPrevCol = "#" + (mPrevCol | 0x1000000).toString(16).substr(-6);
                        document.getElementById("marker1").setAttributeNS(null, "visibility", "visible");
                        document.getElementById("marker1Bg").setAttributeNS(null, "fill", mPrevCol);
                        document.getElementById("marker1Number").textContent = mPrevIdx;
                        document.getElementById("marker1Number").setAttributeNS(null, "fill", lumaOffset(mPrevCol));
                        document.getElementById("prevMarkerName").textContent = (!mPrevName) ? ("unnamed") : (mPrevName);
                    }
                    else { document.getElementById("marker1").setAttributeNS(null, "visibility", "hidden"); }

                    if (mrMapAr[thisl] && mrMapAr[thisl][1] >= 1) {
                        var mThisIdx = mrMapAr[thisl][1];
                        var mThisName = getValFromAr(g_markers, mThisIdx, 2, 1);
                        var mThisCol = getValFromAr(g_markers, mThisIdx, 2, 4);
                        mThisCol = "#" + (mThisCol | 0x1000000).toString(16).substr(-6);
                        document.getElementById("marker2").setAttributeNS(null, "visibility", "visible");
                        document.getElementById("marker2Bg").setAttributeNS(null, "fill", mThisCol);
                        document.getElementById("marker2Number").textContent = mThisIdx;
                        document.getElementById("marker2Number").setAttributeNS(null, "fill", lumaOffset(mThisCol));
                        document.getElementById("atMarkerName").textContent = (!mThisName) ? ("unnamed") : (mThisName);
                    }
                    else { document.getElementById("marker2").setAttributeNS(null, "visibility", "hidden"); }

                    if (mrMapAr[nextl] && mrMapAr[nextl][1] >= 1) {
                        var mNextIdx = mrMapAr[nextl][1];
                        var mNextName = getValFromAr(g_markers, mNextIdx, 2, 1);
                        var mNextCol = getValFromAr(g_markers, mNextIdx, 2, 4);
                        mNextCol = "#" + (mNextCol | 0x1000000).toString(16).substr(-6);
                        document.getElementById("marker3").setAttributeNS(null, "visibility", "visible");
                        document.getElementById("marker3Bg").setAttributeNS(null, "fill", mNextCol);
                        document.getElementById("marker3Number").textContent = mNextIdx;
                        document.getElementById("marker3Number").setAttributeNS(null, "fill", lumaOffset(mNextCol));
                        document.getElementById("nextMarkerName").textContent = (!mNextName) ? ("unnamed") : (mNextName);
                    }
                    else { document.getElementById("marker3").setAttributeNS(null, "visibility", "hidden"); }

                    if (prevl >= 0) { homeIconVis = "hidden"; prevIconVis = "visible"; }
                    else {
                        homeIconVis = "visible"; prevIconVis = "hidden";
                        if (pos > 0) {
                            document.getElementById("marker1").setAttributeNS(null, "visibility", "visible");
                            document.getElementById("prevMarkerName").textContent = "HOME";
                            document.getElementById("marker1Number").textContent = "H";
                            document.getElementById("marker1Bg").setAttributeNS(null, "fill", "#1a1a1a");
                            document.getElementById("marker1Number").setAttributeNS(null, "fill", "#A8A8A8");
                        }
                        else {
                            document.getElementById("marker2").setAttributeNS(null, "visibility", "visible");
                            document.getElementById("atMarkerName").textContent = "HOME";
                            document.getElementById("marker2Number").textContent = "H";
                            document.getElementById("marker2Bg").setAttributeNS(null, "fill", "#1a1a1a");
                            document.getElementById("marker2Number").setAttributeNS(null, "fill", "#A8A8A8");
                        }
                    }
                    if (thisl < 0 && pos != 0) { elAttribute("dropMarker", "visibility", "visible") }
                    else { elAttribute("dropMarker", "visibility", "hidden") }
                    if (nextl >= 0) {
                        endIconVis = "hidden"; nextIconVis = "visible";
                    }
                    else {
                        document.getElementById("marker3").setAttributeNS(null, "visibility", "visible");
                        document.getElementById("nextMarkerName").textContent = "END";
                        document.getElementById("marker3Number").textContent = "E";
                        document.getElementById("marker3Bg").setAttributeNS(null, "fill", "#1a1a1a");
                        document.getElementById("marker3Number").setAttributeNS(null, "fill", "#A8A8A8");
                        endIconVis = "visible"; nextIconVis = "hidden";
                    }
                    elAttribute("iconPrev", "visibility", prevIconVis);
                    elAttribute("iconHome", "visibility", homeIconVis);
                    elAttribute("iconNext", "visibility", nextIconVis);
                    elAttribute("iconEnd", "visibility", endIconVis);

                    newPos = pos;
                    newMrMapLength = mrMapAr.length;
                }
                break;

            case "NTRACK":
                if (tok.length > 1) { nTrack = tok[1]; }
                break;

            case "TRACK":
                idx = parseInt(tok[1]);
                if (tok.length > 5) {
                    var backLoaded = document.getElementById("backLoad");
                    var allTracksDiv = document.getElementById("tracks");
                    var trackFound = document.getElementById("track" + tok[1]);
                    

                    if (!trackFound) {
                        var trackDiv = document.createElement("div");
                        trackDiv.id = ("track" + tok[1]);
                        trackDiv.className = ("trackDiv col");

                        trackHeightsAr[tok[1]] = 0;

                        var trackRow1Div = document.createElement("div");
                        trackRow1Div.className = ("trackRow1");
                        var trackRow2Div = document.createElement("div");
                        trackRow2Div.className = ("trackRow2");
                        trackRow2Div.id = tok[1];
                        var trackSendsDiv = document.createElement("div");
                        trackSendsDiv.id = ("sendsTrack" + idx);

                        if (trackDiv && allTracksDiv) { allTracksDiv.appendChild(trackDiv); }
                        trackDiv.appendChild(trackRow1Div);
                        trackDiv.appendChild(trackRow2Div);
                        trackDiv.appendChild(trackSendsDiv);
                    }

                    else {

                        // console.log("found : track" + tok[1])
                        if (backLoaded != null && backLoaded.nextSibling != null) {
                            var cloneTrackRow1 = document.getElementById("trackRow1Svg").cloneNode(true);
                            var cloneTrackRow2 = document.getElementById("trackRow2Svg").cloneNode(true);
                            var cloneTrackSend = document.getElementById("trackSendSvg").cloneNode(true);


                            if (idx == 0) { //master track stuff

                                var masterTrackContent = document.getElementById("track0");
                                var masterTrackRow2Content = document.createElement("div");
                                masterTrackRow2Content.className = ("trackRow2");
                                masterTrackRow2Content.id = tok[1];
                                masterTrackContent.appendChild(masterTrackRow2Content);
                                // var masterTrackRow2Content = masterTrackContent.childNodes[3];
                                // console.log(masterTrackRow2Content)
                                if (!masterTrackRow2Content.innerHTML) {
                                    masterTrackRow2Content.appendChild(cloneTrackRow2);
                                    
                                    var trackSendsDiv = document.createElement("div");
                                    trackSendsDiv.id = ("sendsTrack0");
                                    masterTrackContent.appendChild(trackSendsDiv);
                                }

                                masterMuteOffButton = document.getElementById("master-mute-off");
                                masterMuteOnButton = document.getElementById("master-mute-on");
                                if (tok[3] & 8) { masterMuteOffButton.style.visibility = "hidden"; masterMuteOnButton.style.visibility = "visible"; }
                                else { masterMuteOffButton.style.visibility = "visible"; masterMuteOnButton.style.visibility = "hidden"; }
                                masterMuteOffButton.onmousedown = mouseDownEventHandler("SET/TRACK/" + 0 + "/MUTE/-1;TRACK/" + 0);
                                masterMuteOnButton.onmousedown = mouseDownEventHandler("SET/TRACK/" + 0 + "/MUTE/-1;TRACK/" + 0);
                                masterClipIndicator = document.getElementById("master-clip_on");
                                if (tok[6] > 0) { masterClipIndicator.style.visibility = "visible"; }
                                else { masterClipIndicator.style.visibility = "hidden"; }
                                masterMeterReadout = document.getElementById("masterDb");
                                masterMeterReadout.textContent = (mkvolstr(tok[4]));

                                

                                var volThumb = masterTrackRow2Content.getElementsByClassName("fader")[0];
                                if (faderConAr[0] != 1) {
                                    volFaderConect(masterTrackRow2Content, volThumb);
                                    faderConAr[0] = 1;
                                }
                                volThumb.volSetting = (Math.pow(tok[4], 1 / 4) * 194.68);
                                var vteMove = "translate(" + volThumb.volSetting + " 0)";
                                if (mouseDown != 1) { volThumb.setAttributeNS(null, "transform", vteMove); }

                                var masterSends = tok[12];
                                if (masterSends != trackSendCntAr[0]) {
                                    trackSendCntAr[0] = masterSends;
                                }
                            }

                            if (idx > 0) { //normal track stuff
                                // console.log(document.getElementById("track" + idx))
                                // console.log(trackRow1Content)
                                var trackRow1Content = document.getElementById("track" + idx).childNodes[0];
                                if (!trackRow1Content.innerHTML) {
                                    trackRow1Content.appendChild(cloneTrackRow1);
                                    trackRow1Content.firstChild.getElementsByClassName("hitbox")[0].id = idx;
                                }

                                var trackRow2Content = document.getElementById("track" + idx).childNodes[1];
                                // console.log(trackRow2Content)
                                if (!trackRow2Content.innerHTML) {
                                    trackRow2Content.appendChild(cloneTrackRow2);
                                }

                                trackBg = trackRow1Content.firstChild.getElementsByClassName("trackrow1bg")[0];
                                if (tok[13] > 0 && tok[13] != trackColoursAr[idx]) {
                                    var customTrackColour = ("#" + (tok[13] | 0x1000000).toString(16).substr(-6));
                                    trackBg.style.fill = customTrackColour;
                                    trackColoursAr[idx] = tok[1];
                                }
                                else { 
                                    
                                    trackBg.style.fill = "#9DA5A5"; }

                                if (tok[1] != trackNumbersAr[idx]) {
                                    trackNumber = trackRow1Content.firstChild.getElementsByClassName("trackNumber")[0];
                                    trackNumber.textContent = tok[1];
                                    trackNumbersAr[idx] = tok[1];
                                }

                                if (tok[2] != trackNamesAr[idx]) {
                                    trackText = trackRow1Content.firstChild.getElementsByClassName("trackName")[0];
                                    trackText.textContent = tok[2];
                                    trackNamesAr[idx] = tok[2];
                                }
                                
                                trackRow1Content.firstChild.getElementsByClassName("recarm")[0].onmousedown = mouseDownEventHandler("SET/TRACK/" + idx + "/RECARM/-1;TRACK/" + idx);
                                trackRow1Content.firstChild.getElementsByClassName("mute")[0].onmousedown = mouseDownEventHandler("SET/TRACK/" + tok[1] + "/MUTE/-1;TRACK/" + tok[1]);
                                trackRow1Content.firstChild.getElementsByClassName("solo")[0].onmousedown = mouseDownEventHandler("SET/TRACK/" + idx + "/SOLO/-1;TRACK/" + idx);
                                trackRow1Content.firstChild.getElementsByClassName("monitor")[0].onmousedown = mouseDownEventHandler("SET/TRACK/" + idx + "/RECMON/-1;TRACK/" + idx);
                                if (tok[3] != trackFlagsAr[idx]) {

                                    recarmOffButton = trackRow1Content.firstChild.getElementsByClassName("recarm-off")[0];
                                    recarmOnButton = trackRow1Content.firstChild.getElementsByClassName("recarm-on")[0];
                                    if (tok[3] & 64) { recarmOffButton.style.visibility = "hidden"; recarmOnButton.style.visibility = "visible"; }
                                    else { recarmOffButton.style.visibility = "visible"; recarmOnButton.style.visibility = "hidden"; }

                                    soloOffButton = trackRow1Content.firstChild.getElementsByClassName("solo-off")[0];
                                    soloOnButton = trackRow1Content.firstChild.getElementsByClassName("solo-on")[0];
                                    if (tok[3] & 16) { soloOffButton.style.visibility = "hidden"; soloOnButton.style.visibility = "visible"; }
                                    else { soloOffButton.style.visibility = "visible"; soloOnButton.style.visibility = "hidden"; }

                                    muteOffButton = trackRow1Content.firstChild.getElementsByClassName("mute-off")[0];
                                    muteOnButton = trackRow1Content.firstChild.getElementsByClassName("mute-on")[0];
                                    if (tok[3] & 64) { muteOffButton.style.visibility = "hidden"; muteOnButton.style.visibility = "hidden"; }
                                    else {
                                        if (tok[3] & 8) { muteOffButton.style.visibility = "hidden"; muteOnButton.style.visibility = "visible"; }
                                        else { muteOffButton.style.visibility = "visible"; muteOnButton.style.visibility = "hidden"; }
                                    }

                                    monitorOffButton = trackRow1Content.firstChild.getElementsByClassName("monitor-off")[0];
                                    monitorOnButton = trackRow1Content.firstChild.getElementsByClassName("monitor-on")[0];
                                    monitorAutoButton = trackRow1Content.firstChild.getElementsByClassName("monitor-auto")[0];
                                    if (tok[3] & 64) {
                                        if (tok[3] & 128) { monitorOffButton.style.visibility = "hidden"; monitorOnButton.style.visibility = "visible"; monitorAutoButton.style.visibility = "hidden"; }
                                        else {
                                            if (tok[3] & 256) { monitorOffButton.style.visibility = "hidden"; monitorOnButton.style.visibility = "hidden"; monitorAutoButton.style.visibility = "visible"; }
                                            else { monitorOffButton.style.visibility = "visible"; monitorOnButton.style.visibility = "hidden"; monitorAutoButton.style.visibility = "hidden"; }
                                        }
                                    }
                                    else { monitorOffButton.style.visibility = "hidden"; monitorOnButton.style.visibility = "hidden"; monitorAutoButton.style.visibility = "hidden"; }

                                    if (tok[3] & 512) { //track hidden in TCP
                                        document.getElementById("track" + idx).style.display = "none";
                                    }
                                    else { document.getElementById("track" + idx).style.display = "block"; }

                                    folderIcon = trackRow1Content.firstChild.getElementsByClassName("folder_icon")[0];
                                    if (tok[3] & 1) { folderIcon.style.visibility = "visible"; }
                                    else { folderIcon.style.visibility = "hidden"; }
                                    trackFlagsAr[idx] = tok[3];
                                }

                                if (tok[10] != trackSendCntAr[idx]) {
                                    sendIndicator = trackRow1Content.firstChild.getElementsByClassName("s_on")[0];
                                    if (tok[10] > 0) { sendIndicator.style.visibility = "visible"; }
                                    else { sendIndicator.style.visibility = "hidden"; }
                                    trackSendCntAr[idx] = tok[10];
                                }

                                if (tok[11] != trackRcvCntAr[idx]) {
                                    rcvIndicator = trackRow1Content.firstChild.getElementsByClassName("r_on")[0];
                                    if (tok[11] > 0) { rcvIndicator.style.visibility = "visible"; }
                                    else { rcvIndicator.style.visibility = "hidden"; }
                                    trackRcvCntAr[idx] = tok[11];
                                }

                                if (tok[12] != trackHwOutCntAr[idx]) {
                                    sendIndicator = trackRow1Content.firstChild.getElementsByClassName("s_on")[0];
                                    if (tok[12] > 0) { sendIndicator.style.visibility = "visible"; }
                                    trackHwOutCntAr[idx] = tok[12];
                                }

                                if (tok[6] != trackPeakAr[idx]) {
                                    clipIndicator = trackRow1Content.firstChild.getElementsByClassName("clip_on")[0];
                                    if (tok[6] > 0) { clipIndicator.style.visibility = "visible"; }
                                    else { clipIndicator.style.visibility = "hidden"; }
                                    trackPeakAr[idx] = tok[6];
                                }

                                meterReadout = trackRow1Content.firstChild.getElementsByClassName("meterReadout")[0];
                                meterReadout.textContent = (mkvolstr(tok[4]));

                                if (tok[3] & 64) { recarmCountAr[idx] = 1 } else { recarmCountAr[idx] = 0 }
                                function getSum(total, num) { return total + num; }
                                var armedCount = document.getElementById("armed_count");
                                var armedText = document.getElementById("armed_text");
                                recarmCount = recarmCountAr.reduce(getSum);
                                armedCount.textContent = recarmCount;
                                armedCount.setAttributeNS(null, "fill", ((recarmCount == 0) ? "#5D3729" : "#545454"));
                                armedText.setAttributeNS(null, "fill", ((recarmCount == 0) ? "#5D3729" : "#545454"));

                                var volThumb = trackRow2Content.firstChild.getElementsByClassName("fader")[0];
                                if (faderConAr[idx] != 1) {
                                    volFaderConect(trackRow2Content, volThumb);
                                    faderConAr[idx] = 1;
                                }
                                volThumb.volSetting = (Math.pow(tok[4], 1 / 4) * 194.68);
                                var vteMove = "translate(" + volThumb.volSetting + " 0)";
                                if (mouseDown != 1) { volThumb.setAttributeNS(null, "transform", vteMove); }
                            }
                            var trackSendsContent = document.getElementById("sendsTrack" + idx);
                            trackSendHwCntAr[idx] = (parseInt(trackSendCntAr[idx]) || 0) + (parseInt(trackHwOutCntAr[idx]) || 0);
                            if (trackSendsContent != null && trackSendHwCntAr[idx] != null) {
                                if (trackSendsContent.childNodes.length < trackSendHwCntAr[idx]) {
                                    var sendDiv = document.createElement("div");
                                    sendDiv.className = ("sendDiv");
                                    trackSendsContent.appendChild(sendDiv);
                                    sendDiv.appendChild(cloneTrackSend);
                                    var thisSendThumb = sendDiv.getElementsByClassName("sendThumb")[0];
                                    sendConect(sendDiv, thisSendThumb);
                                    //bug - adding a send doesn't update the height of that send. So it'll be zero even if the panel is expanded.
                                }
                                if (trackSendsContent.childNodes.length > trackSendHwCntAr[idx]) {
                                    trackSendsContent.removeChild(trackSendsContent.firstChild);
                                }
                            }
                        }
                    }

                    var tracksDiv = document.getElementById('tracks');
                    if (tracksDiv != null) {
                        var tracksDrawnIncMaster = tracksDiv.childNodes;
                        var tracksDrawn = (tracksDrawnIncMaster.length - 1);
                    }
                    if (tracksDrawn > nTrack) {
                        tracks.removeChild(tracks.lastChild);
                    }
                }
                break;

            case "SEND":
                function sendConect(content, thumb) {
                    content.addEventListener("mousemove", sendMouseMoveHandler, false);
                    content.addEventListener("touchmove", sendMouseMoveHandler, false);
                    content.addEventListener("mouseleave", mouseLeaveHandler, false);
                    content.addEventListener("mouseup", sendMouseUpHandler, false);
                    content.addEventListener("touchend", sendMouseUpHandler, false);
                    thumb.addEventListener("mousedown", function (event) { mouseDownHandler(event, event.srcElement) }, false);
                    thumb.addEventListener('touchstart', function (event) {
                        if (event.touches.length > 0) mouseDownHandler(event, event.srcElement);
                        event.preventDefault();
                    }, false);
                }

                if (tok.length > 3) {
                    var targetName;
                    if (tok[6] > 0) targetName = trackNamesAr[tok[6]];
                    else targetName = "Hardware";
                    var sendMuted = ", not muted";
                    if (tok[3] & 8) sendMuted = ", MUTED";

                    var trackSendsContent = document.getElementById("sendsTrack" + tok[1]);
                    if (trackSendsContent.childNodes.length > 0) {
                        var thisSendDiv = trackSendsContent.childNodes[tok[2]];
                        if (thisSendDiv != null) {
                            thisSendDiv.id = [tok[2]];
                            sendTitleText = thisSendDiv.firstChild.getElementsByClassName("sendTitleText")[0];
                            if (sendTitleText.textContent != targetName) sendTitleText.textContent = targetName;
                            sDbText = thisSendDiv.firstChild.getElementsByClassName("sDbText")[0];
                            sDbValue = mkvolstr(tok[4])
                            if (sDbText.Content != sDbValue) sDbText.textContent = sDbValue;

                            var sendLine = thisSendDiv.firstChild.getElementsByClassName("sendLine")[0];
                            sLineSetting = (Math.pow(tok[4], 1 / 4) * 154) + 27;
                            if (mouseDown != 1) { sendLine.setAttributeNS(null, "x2", sLineSetting); }

                            var sendThumb = thisSendDiv.firstChild.getElementsByClassName("sendThumb")[0];
                            if (tok[6] > 0) {
                                var sendTargetBg = document.getElementsByClassName("trackrow1bg")[(tok[6] - 1)]
                                if (sendTargetBg != undefined) { var sendTargetBgColour = (sendTargetBg.getAttribute("style")) }
                                var sendThumbColour = sendThumb.getAttribute("style")
                                var defaultColour = "fill: rgb(157, 165, 165);";
                                if (sendTargetBgColour != defaultColour) {
                                    if (sendThumbColour != sendTargetBgColour) {
                                        sendThumb.setAttributeNS(null, "style", sendTargetBgColour);
                                        sendTitleText.setAttributeNS(null, "style", sendTargetBgColour);
                                        sendThumb.setAttributeNS(null, "opacity", "0.5");
                                    }
                                }
                                else {
                                    sendThumb.setAttributeNS(null, "style", "none");
                                    sendTitleText.setAttributeNS(null, "style", "none");
                                    sendThumb.setAttributeNS(null, "opacity", "0.5");
                                }
                            }

                            sThumbSetting = (Math.pow(tok[4], 1 / 4) * 154) + 27;
                            if (mouseDown != 1) { sendThumb.setAttributeNS(null, "cx", sThumbSetting); }

                            var sendMuteButton = thisSendDiv.firstChild.getElementsByClassName("send_mute")[0];
                            sendMuteButton.onmousedown = mouseDownEventHandler("SET/TRACK/" + tok[1] + "/SEND/" + tok[2] + "/MUTE/-1");
                            var sendMuteOff = thisSendDiv.firstChild.getElementsByClassName("send_mute_off")[0];
                            var sendMuteOn = thisSendDiv.firstChild.getElementsByClassName("send_mute_on")[0];
                            if (tok[3] & 8) {
                                sendMuteOff.style.visibility = "hidden";
                                sendMuteOn.style.visibility = "visible";
                            }
                            else {
                                sendMuteOff.style.visibility = "visible";
                                sendMuteOn.style.visibility = "hidden";
                            }
                        }
                    }
                }
        }
    }
    if (trackSendHwCntAr.length > 0) {
        for (x = 0; x < trackSendHwCntAr.length; x++) {
            if (trackSendHwCntAr[x] > 0) {
                for (y = 0; y < trackSendHwCntAr[x]; y++) {
                    wwr_req("GET/TRACK/" + x + "/SEND/" + y);
                }
            }
        }
    }
}

function on_record_button(e) {
    if (recarmCount > 0 || confirm("no tracks are armed, start record?")) wwr_req(1013);
    return false;
}

function prompt_abort() {
    if (!(last_transport_state & 4)) {
        wwr_req(1016);
    } else {
        if (confirm("abort recording? contents will be lost!")) wwr_req(40668);
    }
}

function prompt_seek() {
    if (!(last_transport_state & 4)) {
        var seekto = prompt("Seek to position:", last_time_str);
        if (seekto != null) {
            wwr_req("SET/POS_STR/" + encodeURIComponent(seekto));
        }
    }
}



function calculateScale(event) {
    var a = document.getElementById("transport_r2");
    if (a) { var drawnWidth = a.clientWidth; }
    else { drawnWidth = 303.6 }
    scaleFactor = drawnWidth / 303.6;

    if (optionsOpen == 1) {
        for (var i = 0; i < hereCss.cssRules.length; i++) {
            if (hereCss.cssRules[i].selectorText == ".optionsBar") {
                hereCss.deleteRule(i);
                hereCss.insertRule(".optionsBar {height:" + (scaleFactor * 50) + "px;}", i);
            }
        }
    }

    // document.getElementById("options").onclick = function () {
    //     if (optionsOpen != 1) {
    //         for (var i = 0; i < hereCss.cssRules.length; i++) {
    //             if (hereCss.cssRules[i].selectorText == ".optionsBar") {
    //                 hereCss.deleteRule(i);
    //                 hereCss.insertRule(".optionsBar {height:" + (scaleFactor * 50) + "px;}", i);
    //             }
    //         }
    //         optionsOpen = 1;
    //     }
    //     else {
    //         for (var i = 0; i < hereCss.cssRules.length; i++) {
    //             if (hereCss.cssRules[i].selectorText == ".optionsBar") {
    //                 hereCss.deleteRule(i);
    //                 hereCss.insertRule(".optionsBar {height:0px;}", i);
    //             }
    //         }
    //         optionsOpen = 0;
    //     }
    // }
}


function hitbox(id) {

    // console.log(id)
    var trackDiv =  document.getElementById("track"+id);
    var thisTrackRow2 = trackDiv.getElementsByClassName("trackRow2")[0];
    // console.log(thisTrackRow2)
    var thisTrackRow2Svg = thisTrackRow2.firstChild.firstElementChild;
    var easingValue = 0;
    transitionTime = 10;

    if (trackHeightsAr[id] == 0) {
        iteration = 0;
        requestAnimationFrame(resizerDown);
        function resizerDown() {
            if (iteration < transitionTime) {
                easingValue = easeInOutCubic(iteration, 0, 1, transitionTime);
                if (easingValue <= 0.1) { easingValue = 0.01; }
                if (transitions == 0) { var row2scaleD = 37; }
                else { row2scaleD = easingValue * 37; }
                thisTrackRow2Svg.setAttributeNS(null, "viewBox", "0 1 320 " + row2scaleD);
                if (trackSendHwCntAr[id] > 0) {
                    if (transitions == 0) { var sendscaleD = 50; }
                    else { sendscaleD = easingValue * 50; }
                    for (x = 0; x < trackSendHwCntAr[id]; x++) {
                        thisSendSvg = document.getElementById("sendsTrack" + [id]).childNodes[x].firstElementChild.firstElementChild;
                        thisSendSvg.setAttributeNS(null, "viewBox", "0 0 320 " + sendscaleD)
                    }
                }
                iteration++;
                requestAnimationFrame(resizerDown);
            }
        }
    }
    else {
        iteration = 0;
        requestAnimationFrame(resizerUp);
        function resizerUp() {
            if (iteration < transitionTime) {
                easingValue = easeInOutCubic(iteration, 1, -1, transitionTime);
                if (transitions == 0) { var row2scaleU = 0.01; }
                else { row2scaleU = easingValue * 37; }
                thisTrackRow2Svg.setAttributeNS(null, "viewBox", "0 0 320 " + row2scaleU);
                if (trackSendHwCntAr[id] > 0) {
                    if (transitions == 0) { var sendscaleU = 0.01; }
                    else { sendscaleU = easingValue * 50; }
                    for (x = 0; x < trackSendHwCntAr[id]; x++) {
                        thisSendSvg = document.getElementById("sendsTrack" + [id]).childNodes[x].firstElementChild.firstElementChild;
                        thisSendSvg.setAttributeNS(null, "viewBox", "0 0 320 " + sendscaleU)
                    }
                }
                iteration++;
                requestAnimationFrame(resizerUp);
            }
        }
    }
    trackHeightsAr[id] ^= 1;
}

function init() {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        for (let l = 0; l < document.styleSheets.length; l++) {
            let ss = document.styleSheets[l];
            if (ss.cssRules) for (let i = 0; i < ss.cssRules.length; i++) {
                let st = ss.cssRules[i].selectorText;
                if (st != undefined && st.startsWith(".button")) ss.removeRule(i--);
                transitions = 0;
                doTransitionButton();
            }
        }
    }
}



function BtoMB(beats) {
    var mbM = Math.floor(beats / ts_numerator);
    var mbB = beats - (mbM * ts_numerator);
    return (mbM + "." + mbB)
}



function doTransitionButton() {
    if (transitions == 1) {
        transitionsButton.childNodes[3].setAttributeNS(null, "visibility", "visible");
        transitionsButton.childNodes[7].setAttributeNS(null, "visibility", "hidden");
        for (var i = 0; i < hereCss.cssRules.length; i++) {
            if (hereCss.cssRules[i].selectorText == "#optionsBar") {
                hereCss.deleteRule(i);
                hereCss.insertRule("#optionsBar {overflow-y: hidden;-webkit-transition: all 0.2s ease-out;-o-transition: all 0.2s ease-out;transition: all 0.2s ease-out;}", i);
            }
        }
    }
    else {
        transitionsButton.childNodes[3].setAttributeNS(null, "visibility", "hidden");
        transitionsButton.childNodes[7].setAttributeNS(null, "visibility", "visible");
        for (var i = 0; i < hereCss.cssRules.length; i++) {
            if (hereCss.cssRules[i].selectorText == "#optionsBar") {
                hereCss.deleteRule(i);
                hereCss.insertRule("#optionsBar {overflow-y: hidden;}", i);
            }
        }
    }
}




function joggerHandler() {
    var jOffsetX = 0;
    var mouseOnJogger = true;
    var jTimer = setInterval(joggerCounter, 100)

    if (event.targetTouches != undefined) { startX = event.targetTouches[0].pageX }
    else { startX = event.pageX }

    jogger.addEventListener('touchend', function (event) { joggerUp(); event.preventDefault(); }, false);
    jogger.addEventListener("mouseup", joggerUp, false);

    function joggerUp() {
        mouseOnJogger = false;
        var joggerAggExp = Math.exp(Math.abs(joggerAgg)) * Math.sign(joggerAgg);

        if (statusPosition[1] == "Measures.Beats") {
            var joggerAggExpB = (Math.floor(Math.exp(Math.abs(joggerAgg)))) * Math.sign(joggerAgg);
            var sPs = statusPosition[0].split(".")
            var sumB = (parseInt(sPs[1]) + joggerAggExpB);
            var mbM = Math.floor(sumB / ts_numerator)
            var mbB = sumB - (mbM * ts_numerator);
            var newM = mbM + parseInt(sPs[0]);
            if (snapState == 1) wwr_req("SET/POS_STR/" + newM + "." + mbB + ".00");
            else wwr_req("SET/POS_STR/" + newM + "." + mbB + "." + sPs[2]);
        }
        else {
            pos = parseFloat(playPosSeconds);
            wwr_req("SET/POS/" + (pos + joggerAggExp));
        }
        clearInterval(jTimer);
        joggerRotate(0);
        setTimeout(function () { joggerAgg = "0"; }, 500);
    }

    jogger.addEventListener("mouseleave", joggerLeave, false);

    function joggerLeave() {
        mouseOnJogger = false;
        clearInterval(jTimer);
        joggerRotate(0);
        joggerAgg = "0";
    }

    jogger.addEventListener("touchmove", function (event) { joggerMove(); event.preventDefault(); }, false);
    jogger.addEventListener("mousemove", joggerMove, false);

    function joggerMove() {
        if (mouseOnJogger == true) {

            if (event.changedTouches != undefined) { //we're doing touch stuff
                jOffsetX = (event.changedTouches[0].pageX - startX) / joggerWidth;
            }
            else { jOffsetX = (event.pageX - startX) / joggerWidth; }
            if (jOffsetX > 0.5) (jOffsetX = 0.5);
            if (jOffsetX < -0.5) (jOffsetX = -0.5);
            joggerRotate(jOffsetX * 90);
            jMOffsetX = jOffsetX;
        }
        else {
            joggerRotate(0);
        }
    }

    function joggerCounter() {
        if (mouseOnJogger == true) {
            joggerAgg = parseFloat(joggerAgg) + jMOffsetX;
        }
    }
}

function joggerRotate(angle) {
    var wheel = document.getElementById("wheel");
    var wheelClipRect = document.getElementById("clip_rect");
    var wheelAngle = "rotate(" + angle + " 159 181)";
    var clipAngle = "rotate(" + (-1 * angle) + " 159 181)";
    wheel.setAttributeNS(null, "transform", wheelAngle);
    wheelClipRect.setAttributeNS(null, "transform", clipAngle);
}



function easeInOutCubic(t, b, c, d) {
    if ((t /= d / 2) < 1) {
        return c / 2 * t * t * t + b;
    }
    else { return c / 2 * ((t -= 2) * t * t + 2) + b; }
};
