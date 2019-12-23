function SvgMapInstView(instTypeName,instClassName,instCsName,
    updateTagCallback,updateDetailsCallback,setEventHandlersCallback,
    templateFileName) {
    this.templateFileName = templateFileName;
    this.instTypeName = instTypeName;
    this.instClassName = instClassName;
    this.instCsName = instCsName;
    this.updateTagCallback = updateTagCallback;
    this.updateDetailsCallback = updateDetailsCallback;
    this.setEventHandlersCallback = setEventHandlersCallback;
    this.templateInfo = null;
    this.viewName = null;

    this.configureFrame = function(_app) {
        if(this.instTypeName) {
            _app.selection.filter.instTypeName = this.instTypeName;
            _app.selectionOptions.instTypeName = [];
        }
        else {
            _app.selectionOptions.instTypeName = getTypeOptions(_app.vd);
            if(!_app.selection.filter.instTypeName) {
                _app.selection.filter.instTypeName = 
                    _app.selectionOptions.instTypeName.length>0 ? 
                    _app.selectionOptions.instTypeName[0] : "topology";
            }
            
        }

        if(this.instClassName) {
            _app.selection.filter.instClassName = this.instClassName;
            _app.selectionOptions.instClassName = [];
        }

        if(this.instCsName) {
            _app.selection.filter.instCsName = this.instCsName;
            _app.selectionOptions.instCsName = [];
        }
    };

    this.updateView = function(_app) {
        this.updateFilterOptions(_app);
        this.updateSvgMap(_app);
        this.updateSvgSelection(_app);
    },
    
    this.updateFilterOptions = function(_app) {
        if(!this.instClassName) {
            _app.selectionOptions.instClassName = getClassOptionsByType(_app.selection.filter.instTypeName,_app.vd);
            if(!_app.selection.filter.instClassName) {
                _app.selection.filter.instClassName = _app.selectionOptions.instClassName.length>0 ? _app.selectionOptions.instClassName[0] : "None";
            }
        }
 
        if(!this.instCsName) {
            _app.selectionOptions.instCsName = getCsOptionsByClass(_app.selection.filter.instTypeName,
                                                                   _app.selection.filter.instClassName,
                                                                   _app.vd);
           
           if(!_app.selection.filter.instCsName) {
               _app.selection.filter.instCsName = _app.selectionOptions.instCsName.length>0 ? _app.selectionOptions.instCsName[0] : "None";
           }
         }
 
         _app.selectionOptions.instPlaceName = getPlaceOptionsByClassAndCs(_app.selection.filter.instTypeName,
                                                                          _app.selection.filter.instClassName,
                                                                          _app.selection.filter.instCsName,
                                                                          _app.vd);
        if(!_app.selection.filter.instPlaceName) _app.selection.filter.instPlaceName = "All";                                                                  
    },

    this.updateSvgMap = function(_app) {
        var _this = this;
        var tInfo = _app.viewFrame.loadedViewTemplates[this.templateFileName];
        var svgNode = tInfo.svgNode;
        // init tag-group places
        if(this.templateInfo.views[this.viewName]) {
            var legendTabName = "Legend - " + this.viewName;
            var selector = 'g[name="'+legendTabName+'"] > g.tag-group[name]';
            d3.select(svgNode).selectAll(selector).each(function(d,i){
                _this.initMapPlace(this,_app);
            });
        };     
        // init node and link places
        d3.select(svgNode).selectAll('g[name="Map"] > g').each(function (d, i) {
            _this.initMapPlace(this,_app);
        });

    },

    this.initMapPlace = function(placeSvgNode,_app) {
        var gSel = d3.select(placeSvgNode);
        var gName = gSel.attr("name");
        var gType = gSel.attr("dadis-type");
        // reset
        gSel.datum(null);
        // initialise the node datum and bind vd data
        var nodePlaceProxies = getPlaceProxyForMapPlace("node",gName,_app.selectionOptions.instPlaceName,_app.vd);
        var linkPlaceProxies = getPlaceProxyForMapPlace("link",gName,_app.selectionOptions.instPlaceName,_app.vd);
        var instPlaceProxies = Object.keys(nodePlaceProxies).length>0 ? nodePlaceProxies : linkPlaceProxies;
        if(Object.keys(instPlaceProxies).length>0) {
            var gDatum = {
                places: instPlaceProxies,
                selected: false,
                v: {
                    tag: null,
                    details: null
                },
                x:0,
                y:0
            };
            gSel.datum(gDatum);
        }
    },

    this.updateSvgSelection = function(_app) {
        var _this = this;
        var tInfo = this.templateInfo;
        var selectedPlaceName = _app.selection.filter.instPlaceName;

        // update the Map title
        var title = _app.viewFrame.activeViewName + " ["+selectedPlaceName+"]";
        d3.select(tInfo.svgNode).select('g[name="Background"]').select("g.view_title > text").text(title).attr("text-anchor","middle");

        // update group tags
        var legendTabName = "Legend - " + this.viewName;
        var selector = 'g[name="'+legendTabName+'"] > g.tag-group[name]';
        d3.select(tInfo.svgNode).selectAll(selector).each(function(d,i){
            _this.updateMapPlace(this,selectedPlaceName,_app);
        });

        d3.select(tInfo.svgNode).selectAll('g[name="Map"] > g').each(function (d, i) {
            _this.updateMapPlace(this,selectedPlaceName,_app);
        });
    },

    this.updateMapPlace = function(placeSvgNode,selectedPlaceName,_app) {
        var gSel = d3.select(placeSvgNode);
        var gName = gSel.attr("name");
        var gType = gSel.attr("dadis-type");
        var gDatum = gSel.datum();

        gSel.on("pointerenter", null).on("pointerleave", null);                        
        gSel.select("title").remove();
        gSel.datum(gDatum);
        gSel.style("cursor", "default");
        setDefaultGroupStyle(this, gSel,_app);
        this.updateTagCallback ? this.updateTagCallback(this, gSel,_app) : updateTag(this, gSel,_app);
        this.updateDetailsCallback ? this.updateDetailsCallback(this, gSel,_app) : updateDetails(this, gSel,_app);
        this.setEventHandlersCallback ? this.setEventHandlersCallback(this, gSel,_app) : setEventHandlers(this, gSel,_app);  
        this.setPlaceVisibility(gType,placeSvgNode,false);

        if(gDatum) {
            var instPlaceProxies = gDatum.places;
            if(instPlaceProxies[selectedPlaceName] || selectedPlaceName=="All") {
                gDatum.selected = true;
                gSel.datum(gDatum);
                gSel.style("cursor", "pointer");  
                setDataboundGroupStyle(this, gSel,_app);
                this.setPlaceVisibility(gType,placeSvgNode,true);
            }
            else {
                gDatum.selected = false;
                gSel.datum(gDatum);
            }
        }
    },

    this.setPlaceVisibility = function(placeType,placeSvgNode,makeVisible) {
        var gSel = d3.select(placeSvgNode);
        var visState = makeVisible ? "visible" : "hidden";
        if(placeType=="link") {
            gSel.select("g.link-tag").style("visibility", visState);
        }
        else if(placeType=="node"){
            gSel.select("g.node-tag").style("visibility", visState);
        }
        else {
            // assume this is a tag-group
            gSel.style("visibility", visState);
        }
    }
};


function updateTag(view, gSel,_app) {
    var selectedPlaceName = _app.selection.filter.instPlaceName;
    var gDatum = gSel.datum();
    if(gDatum) {
        var instPlaceProxies = gSel.datum().places;
        var instCount = 0;
        for(placeName in instPlaceProxies) {
            if( selectedPlaceName==placeName || selectedPlaceName=="All") {
                var pProxy = instPlaceProxies[placeName];
                var pEl = _app.vd.el[pProxy.placeId];
                instCount += instPlaceProxies[placeName].inst.length;
            }
        }
        tag = instCount;
        var tagSel = gSel.select("g.node-tag, g.link-tag");
        tagSel.style("visibility", "visible").select("text").html(tag);//.attr("text-anchor","start");
        gDatum.v.tag = tag;
        gSel.datum(gDatum);
    }
};


function getDistanceFromNodeZero(nodeEl,_app) {
    if(!nodeEl.in["assigned to"] || !nodeEl.in["assigned to"].link) {
        // this this the node zero!
        return 0;
    }
    else {
        var prevLinkEl = _app.vd.el[nodeEl.in["assigned to"].link.all[0]];
        var prevNodeEl = _app.vd.el[prevLinkEl.in["assigned to"].node.all[0]];
        return 1 + getDistanceFromNodeZero(prevNodeEl,_app);
    }
}

function getFarEndPlaceForTopology(topoEl,_app) {
    var farEndPlace;
    var farEndNodeEl,endNodeEl,endLinkId;
    var farEndDist = -1;
    for(var i=0;i<topoEl.leaf.node.length;i++) {
        var nodeEl = _app.vd.el[topoEl.leaf.node[i]];
        var isEndNode;
        if(nodeEl.out["assigned to"].link) {
            isEndNode = true;
            for(k=0;k<nodeEl.out["assigned to"].link.all.length;k++) {
                var nextLinkId = nodeEl.out["assigned to"].link.all[k];
                if(!(topoEl.leaf.link.indexOf(nextLinkId)<0)) {
                    // not end node
                    isEndNdoe = false;
                    break;
                }
            }
            if(isEndNode) {
                // the nodeEl is non-terminal end node
                endNodeEl = nodeEl;
            }
        }
        else {
            // this is terminl node, good enough
            isEndNode = true;
            endNodeEl = nodeEl;
        }
        if(isEndNode) {
            var dist = getDistanceFromNodeZero(endNodeEl,_app);
            if(dist>farEndDist) {
                farEndDist = dist;
                farEndNodeEl = endNodeEl;
            }
        }
    }
    if(farEndNodeEl) {
        if(farEndNodeEl.out["assigned to"] && farEndNodeEl.out["assigned to"].link) {
            // use far end link as the far end place
            for(k=0;k<farEndNodeEl.in["assigned to"].link.all.length;k++) {
                var prevLinkId = farEndNodeEl.in["assigned to"].link.all[k];
                if(topoEl.leaf.link.indexOf(prevLinkId)>=0) {
                    var farEndLinkEl = _app.vd.el[prevLinkId];
                    return farEndLinkEl;
                }
            }
            console.log("DA_DIS ERROR: far end link not found for topology " + topoEl.name);
            return null;
        }
        else {
            // terminal node case
            // use the far end node as the far end place
            return farEndNodeEl;
        }
    }
    else {
        console.log("DA_DIS ERROR: far end place not found for topology " + topoEl.name);
        return null;
    }
}

function getMapPlaceOneProxyTagContent(viewName,gName,pProxy,_app) {
    var placeEl = _app.vd.el[pProxy.placeId];
    var tag = "";
    for(var j=0;j<pProxy.inst.length;j++) {
        var instEl = _app.vd.el[pProxy.inst[j].instId];
        if(instEl.tag) {
            var tagContent = getTagContent(viewName,gName,placeEl.name,instEl);
            if(tagContent) {
                if(_app.mode=="all") {
                    tagContent += " (" + placeEl.name +")";
                }
                tag += " ["+tagContent+"] ";
            }
        }
    }
    return tag;    
}

function updateTagSimpleText(view, gSel,_app) {
    var viewName = _app.viewFrame.activeViewName;
    var gName = gSel.attr("name");
    var selectedPlaceName = _app.selection.filter.instPlaceName;
    var tag = "";
    var gDatum = gSel.datum();
    if (gDatum) {
        var instPlaceProxies = gDatum.places;
        var proxiesToShow;
        if(selectedPlaceName=="All") {
            proxiesToShow = Object.values(instPlaceProxies);
        }
        else if(instPlaceProxies[selectedPlaceName]) {
            proxiesToShow = [instPlaceProxies[selectedPlaceName]];
        }
        else {
            proxiesToShow = [];
        }
        for(var k=0;k<proxiesToShow.length;k++) {
            var pProxy = proxiesToShow[k];
            pProxy.refName = null;
        }
        for(var k=0;k<proxiesToShow.length;k++) {
            var pProxy = proxiesToShow[k];
            if(pProxy.inst.length>0) {
                var placeEl = _app.vd.el[pProxy.placeId];
                if(placeEl.type=="topology") {
                    // the place is a topology
                    if(!pProxy.refName) {
                        var farEndPlaceEl = getFarEndPlaceForTopology(placeEl,_app);
                        pProxy.refName = farEndPlaceEl.name;
                    }
                    if(gName==pProxy.refName) {
                        tag += getMapPlaceOneProxyTagContent(viewName,gName,pProxy,_app);
                    }
                }
                else {
                    tag += getMapPlaceOneProxyTagContent(viewName,gName,pProxy,_app);
                }
            }
        }
        var tagSel = gSel.select("g.node-tag, g.link-tag");
        tagSel.style("visibility", "visible").select("text").html(tag);//.attr("text-anchor","start");
        gDatum.v.tag = tag;
        gSel.datum(gDatum);
    }
};

function updateDetails(view, gSel,_app) {
    var selectedPlaceName = _app.selection.filter.instPlaceName;
    var gDatum = gSel.datum();
    if(gDatum) {
        var instPlaceProxies = gDatum.places;
        var gName = gSel.attr("name");
        var gType = gSel.attr("dadis-type");
        var details = "";
        for(var pName in instPlaceProxies) {
            if( selectedPlaceName==pName || selectedPlaceName=="All") {
                var pProxy = instPlaceProxies[pName];
                var pEl = _app.vd.el[pProxy.placeId];
                for(var i=0;i<pProxy.inst.length;i++) {
                    var instProxy = pProxy.inst[i];
                    var instEl = _app.vd.el[instProxy.instId];
                    if(!details) {
                        details = "Data at "+gType+" '"+gName+"':<br>";
                    }
                    if(i==0) {
                        details += (pEl.type + " " + pEl.name + " measures:<br>");
                    }
                    details += ("    " + instProxy.type + " '" + instProxy.coreName + "' tags: " + JSON.stringify(instEl.tag)+";<br>");
                    if(i==(pProxy.inst.length-1)) {
                        details += "<br>";
                    }
                }
            }
        }
        gDatum.v.details = details;
        gSel.datum(gDatum);
    }
};

function updateDetailsNone(view, gSel,_app) {
    if(_app.mode=="all") {
        updateDetails(view, gSel,_app);
    }
};

function updateDetailsNotes(view, gSel,_app) {
    var selectedPlaceName = _app.selection.filter.instPlaceName;
    var gDatum = gSel.datum();
    if(gDatum) {
        var instPlaceProxies = gDatum.places;
        var details = "";
        for(var pName in instPlaceProxies) {
            if( selectedPlaceName==pName || selectedPlaceName=="All") {
                var pProxy = instPlaceProxies[pName];
                var pEl = _app.vd.el[pProxy.placeId];
                for(var i=0;i<pProxy.inst.length;i++) {
                    var instProxy = pProxy.inst[i];
                    var instEl = _app.vd.el[instProxy.instId];
                    if(i==0) {
                        details += (view.viewName + " Information for '"+ pEl.name + "':<br>");
                    }
                    if(pProxy.inst.length>1) {
                        details += ("Instance " + i + "");   
                    }
                    details += (instEl.notes + "<br>");
                    if(i==(pProxy.inst.length-1)) {
                        details += "<br>";
                    }
                }
            }
        }
        gDatum.v.details = details;
        gSel.datum(gDatum);
    }
};

function setStyleForRelatedPlaces(view, gSel,_app,setStyleCallback) {
    var svgNode = view.templateInfo.svgNode;
    var gDatum = gSel.datum();
    if(gDatum) {
        var instPlaceProxies = gSel.datum().places;
        for(var pName in instPlaceProxies) {
            var pProxy = instPlaceProxies[pName];
            var pEl = _app.vd.el[pProxy.placeId];
            if(pEl.leaf) {
                for(var i=0;i<pEl.leaf.link.length;i++) {
                    var el =_app.vd.el[pEl.leaf.link[i]];
                    var selector = 'g[name="Map"] > g[name="'+el.name+'"]';
                    d3.select(svgNode).selectAll(selector).each(function(d,i){
                        if(d && d.selected) {
                                setStyleCallback(view, d3.select(this),_app);
                        } 
                    });
                }
                for(var i=0;i<pEl.leaf.node.length;i++) {
                    var el =_app.vd.el[pEl.leaf.node[i]];
                    var selector = 'g[name="Map"] > g[name="'+el.name+'"]';
                    d3.select(svgNode).selectAll(selector).each(function(d,i){
                        if(d && d.selected) {
                                setStyleCallback(view, d3.select(this),_app);
                        } 
                    });
                }
            }
            else {
                var el =_app.vd.el[pEl.id];
                var selector = 'g[name="Map"] > g[name="'+el.name+'"]';
                d3.select(svgNode).selectAll(selector).each(function(d,i){
                    if(d && d.selected) {
                            setStyleCallback(view, d3.select(this),_app);
                    } 
                });
            }
        }
    }
};

function setEventHandlers(view, gSel,_app) {
    gSel
    .on("pointerenter", function (d, i) {
        var gDatum = gSel.datum();
        var details = gDatum ? gDatum.v.details : ""; //"No Data at '"+gSel.attr("name")+"'";
        if(details && (!d || !d.drag)) {
            d3.select(".dadis-tooltip")
            .style("top",d3.event.pageY+10 + "px")
            .style("left",d3.event.pageX+10 + "px")
            .style("display","block")
            .html(details);
        }
        if(gDatum && gDatum.selected) {
            setActiveGroupStyle(view, gSel,_app);
            setStyleForRelatedPlaces(view, gSel,_app,setActiveGroupStyle);
        }        
    })
    .on("pointerleave", function (d, i) {
        var gDatum = gSel.datum();
        var details = gDatum ? gDatum.v.details : ""; //"No Data at '"+gSel.attr("name")+"'";
        if(details && (!d || !d.drag)) {
            d3.select(".dadis-tooltip")
            .style("display","none")
            .html("");
        }
        var gDatum = gSel.datum();
        if(gDatum && gDatum.selected) {
            setStyleForRelatedPlaces(view, gSel,_app,setDataboundGroupStyle);
            setDataboundGroupStyle(view, gSel,_app);
        }
    });
    var sel = gSel.select("g.node-tag, g.link-tag");
    if(!sel.node()) {
        sel = gSel;
    }
    sel.call(d3.drag()
    .on("start",function(d,i) {
        var sel = d3.select(this)
        d.drag = {
            startX: d3.event.x,
            startY: d3.event.y,
            initialTransform: sel.attr("transform")
        };
        d3.select(".dadis-tooltip")
        .style("display","none")
        .html("");
    })
    .on("drag", function(d, i) {
        d3.select(this).attr("transform", "translate(" + (d3.event.x-d.drag.startX) + "," + (d3.event.y-d.drag.startY) + ") " + d.drag.initialTransform);
    })
    .on("end",function(d,i){
        //d3.select(this).attr("transform", d.drag.initialTransform);
        d.drag = null;
    })
    );
};

function setGroupStyle(svgStyles, gSel, newStyleName) {
    for (var shapeType in svgStyles) {
        for (var placeType in svgStyles[shapeType]) {
            gSel.selectAll("g." + shapeType + " > " + placeType)
                .attr("class", svgStyles[shapeType][placeType][newStyleName])
        }
    }
};

function setDefaultGroupStyle(view, gSel,_app) {
    setGroupStyle(view.templateInfo.styles, gSel, "default");
    gSel.lower();
};

function setDataboundGroupStyle(view, gSel,_app) {
    setGroupStyle(view.templateInfo.styles, gSel, "highlighted");
    gSel.raise();
};

function setActiveGroupStyle(view, gSel,_app) {
    setGroupStyle(view.templateInfo.styles, gSel, "active");
    gSel.raise();
};
