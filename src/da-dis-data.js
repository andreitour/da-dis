// load MID dataset to the da-dis runtime 
function loadData(mid,vd,afterLoadCallback) {
    var baseUrl = "data/" + _config.dataVer + "/"; 
    d3.csv(baseUrl+"elements.csv").then(function(els_data){
        mid.els = els_data;
        d3.csv(baseUrl+"connectors.csv").then(function(cons_data){
            mid.cons = cons_data;
            d3.csv(baseUrl+"tags.csv").then(function(tags_data){
                mid.tags = tags_data;
                mid2vd(mid,vd);
                if(afterLoadCallback) {
                    afterLoadCallback();
                }
            });
        });
    });
};

// transform a MID dataset to a VD dataset
function mid2vd(mid,vd) {
    // bring all els
    for(var i=0;i<mid.els.length;i++) {
        var midEl = mid.els[i];
        if(vd.type[midEl.Stereotype]) {
            var vdEl = { 
                type: midEl.Stereotype,
                id: midEl.Guid,
                name: midEl.Name,
                alias: midEl.Alias,
                notes: midEl.Notes,
                out:{},
                in:{},
                tag:{}
            };
            if(!vd.type[midEl.Stereotype].all ) { 
                vd.type[midEl.Stereotype].all = []; 
                vd.type[midEl.Stereotype].inst = {};
                vd.type[midEl.Stereotype].core = {};
            };
            vd.type[midEl.Stereotype].all.push(vdEl.id);
            vd.el[vdEl.id] = vdEl; 
        }
    }

    // bring all cons
    for(i=0;i<mid.cons.length;i++) {
        var midCon = mid.cons[i];
        var sEl = vd.el[midCon.Source_Guid];
        var tEl = vd.el[midCon.Target_Guid];
        if(sEl && tEl) {
            var vdCon = {
                type:midCon.Stereotype,
                id:midCon.Guid,
                sid:sEl.id,
                tid:tEl.id,
                tag:{}
            };

            if(!sEl.out[midCon.Stereotype]) {sEl.out[midCon.Stereotype]={}};
            if (!sEl.out[midCon.Stereotype][tEl.type]) {sEl.out[midCon.Stereotype][tEl.type]={all:[]}}; 
            sEl.out[midCon.Stereotype][tEl.type].all.push(vdCon.tid);            

            if(!tEl.in[midCon.Stereotype]) {tEl.in[midCon.Stereotype]={}};
            if (!tEl.in[midCon.Stereotype][sEl.type]) {tEl.in[midCon.Stereotype][sEl.type]={all:[]}}; 
            tEl.in[midCon.Stereotype][sEl.type].all.push(vdCon.sid);            

            vd.con[vdCon.id] = vdCon;
        }
    }
    
    // set els and cons tags
    for(i=0;i<mid.tags.length;i++) {
        var midTag = mid.tags[i];
        var entityId = midTag.Element_Guid;
        var entity;
        if(vd.el[entityId]) {
            entity = vd.el[entityId]; 
        } else if (vd.con[entityId]) {
            entity = vd.con[entityId];
        } 
        if(entity) {
            entity.tag[midTag.Name] = midTag.Value;
        }
    }

    // separate core from instances, group els by core names, and set places for instances
    for(var type in vd.type) {
        for(var i=0;i<vd.type[type].all.length;i++) {
            var el = vd.el[vd.type[type].all[i]];
            var name; 
            if(el.out["assigned to"] && el.out["assigned to"]["configuration state"] &&
                el.out["part of"] && el.out["part of"][el.type] ) {
                // instance element
                var classEl = vd.el[ el.out["part of"][el.type].all[0]];
                name = classEl.name;
                if(!vd.type[type].inst[name]) { vd.type[type].inst[name] = []};
                vd.type[type].inst[name].push(el.id);
            } else {
                // core class element
                name = el.name; 
                if(!vd.type[type].core[name]) { vd.type[type].core[name] = []};
                vd.type[type].core[name].push(el.id);
            }
        }
    }

    // set end node ids for topologies
    if(vd.type.topology) {
        for(var i=0;i<vd.type.topology.all.length;i++) {
            var topoEl = vd.el[vd.type.topology.all[i]]; 
            topoEl.leaf = {
                node: getTopologyLeafPlaceIds("node",topoEl,vd),
                link: getTopologyLeafPlaceIds("link",topoEl,vd)
            };
        }
    }

    vd.ready = true;
    return vd;
};

function getAllInstPlaceIds(instEl,vd) {
    var placeIds = [];
    if(instEl.out["assigned to"].node) {
        placeIds = placeIds.concat(instEl.out["assigned to"].node.all);
    }
    if(instEl.out["assigned to"].link) {
        placeIds = placeIds.concat(instEl.out["assigned to"].link.all);
    }
    if(instEl.out["assigned to"].topology) {
        placeIds = placeIds.concat(getInstTopologyForestIds(instEl.out["assigned to"].topology.all,vd));
    }
    return placeIds;
};

function getInstTopologyForestIds(leafTopoIds,vd) {
    var forestIds = [].concat(leafTopoIds);
    for(var i=0;i<leafTopoIds.length;i++) {
        var leafTopo = vd.el[leafTopoIds[i]];
        if(leafTopo.out["part of"] && leafTopo.out["part of"].topology) {
            var parentForestIds = getInstTopologyForestIds(leafTopo.out["part of"].topology.all,vd)
            for(var j=0;j<parentForestIds.length;j++) {
                var parentTopoId = parentForestIds[j];
                if(forestIds.indexOf(parentTopoId)<0) {
                    forestIds.push(parentTopoId);
                }
            }
        }
    }
    return forestIds;
};

function getTopologyLeafPlaceIds(placeType,topoEl,vd) {
    var placeIds = [];
    if(topoEl.in["assigned to"] && topoEl.in["assigned to"][placeType]) {
        placeIds = placeIds.concat(topoEl.in["assigned to"][placeType].all);
    }
    if(topoEl.in["part of"] && topoEl.in["part of"].topology) {
        var childTopoIds = topoEl.in["part of"].topology.all;
        for(var i=0; i<childTopoIds.length;i++) {
            var childTopoEl = vd.el[childTopoIds[i]];
            var chlidTopoLeafPlaceIds = getTopologyLeafPlaceIds(placeType,childTopoEl,vd);
            for(var j=0;j<chlidTopoLeafPlaceIds.length;j++) {
                var chlidTopoLeafPlaceId = chlidTopoLeafPlaceIds[j];
                if(placeIds.indexOf(chlidTopoLeafPlaceId)<0) {
                    placeIds.push(chlidTopoLeafPlaceId);
                }
            }
        }
    }
    return placeIds;
};

function getTypeOptions(vd) {
    return Object.keys(vd.type).filter(function(item){return item!="all"});
};

function getClassOptionsByType(instTypeNameSel,vd) {
    var options = ["All"];
    for(var className in vd.type[instTypeNameSel].core) {
        options.push(className);
    }            
    return options;
}
function getCsOptionsByClass(instTypeNameSel,clNameSel,vd) {
    var options = ["All"];
    for(var clName in vd.type[instTypeNameSel].inst) {
        if(clName==clNameSel || clNameSel=="All") {
            var instIds = vd.type[instTypeNameSel].inst[clName];
            for(var i=0;i<instIds.length;i++) {
                var instId = instIds[i];
                var inst = vd.el[instId];
                if (inst.out["assigned to"]["configuration state"]) {
                    for(var j=0;j<inst.out["assigned to"]["configuration state"].all.length;j++) {
                        var instCsId = inst.out["assigned to"]["configuration state"].all[j];
                        var instCs = vd.el[instCsId];
                        if(options.indexOf(instCs.name)<0) {
                            options.push(instCs.name);
                        }
                    }
                }
            }
        }
    }
    return options;
}   

function getPlaceOptionsByClassAndCs(instTypeNameSel,clNameSel,csNameSel,vd) {
    var options = {All:{inst:[]}};
    for(var clName in vd.type[instTypeNameSel].inst) {
        if(clNameSel=="All" || clNameSel==clName) {
            // instances should be selected
            var instIds = vd.type[instTypeNameSel].inst[clName];
            for(var i=0;i<instIds.length;i++) {
                var instEl = vd.el[instIds[i]];
                if(instEl.out["assigned to"]["configuration state"]) {
                    var instHasCsNameSel = false;
                    if (csNameSel=="All") {
                        instHasCsNameSel = true;
                    } else {
                        // look through names of all configuration states assigned to the instance
                        for(var j=0;j<instEl.out["assigned to"]["configuration state"].all.length;j++) {
                            var csId = instEl.out["assigned to"]["configuration state"].all[j];
                            var cs = vd.el[csId];
                            if(cs.name==csNameSel) {
                                instHasCsNameSel = true;
                                break;
                            }
                        }
                    }
                    if(instHasCsNameSel) {
                        updatePlaceOptionsByInst(clName,instEl,"node",options,vd);
                        updatePlaceOptionsByInst(clName,instEl,"link",options,vd);
                        updatePlaceOptionsByInst(clName,instEl,"topology",options,vd);
                    }
                }
            }
        }
    }
    return options;
};

function updatePlaceOptionsByInst(clName,instEl,placeType,options,vd) {
        if(instEl.out["assigned to"][placeType]) {
            var placeIds = instEl.out["assigned to"][placeType].all;
            for(var j=0;j<placeIds.length;j++) {
                var placeEl = vd.el[placeIds[j]];
                if(!options[placeEl.name]) {
                    options[placeEl.name] = {
                        placeId:placeEl.id, 
                        inst: []
                    };
                }
                var instProxy = {
                    instId: instEl.id,
                    type: instEl.type,
                    coreName: clName
                };
                options[placeEl.name].inst.push(instProxy);
                options.All.inst.push(instProxy);
            }
        }
};

function getPlaceProxyForMapPlace(mapPlaceType,mapPlaceName,allPlaceProxies,vd) {
    var placeProxies = {};
    var mapPlaceEl;
    if(vd.type[mapPlaceType] && vd.type[mapPlaceType].core[mapPlaceName]) {
        mapPlaceEl = vd.el[vd.type[mapPlaceType].core[mapPlaceName][0]];
    }
    else {
        return placeProxies;
    }

    for(instPlaceName in allPlaceProxies) {
        var placeProxy = allPlaceProxies[instPlaceName];
        if(vd.type.topology.core[instPlaceName]) {
            // this is topology
            var topoEl = vd.el[vd.type.topology.core[instPlaceName][0]];
            if (topoEl.leaf[mapPlaceType].indexOf(mapPlaceEl.id)>=0) {
                placeProxies[instPlaceName]=placeProxy;
            }
        }
        else {
            if(instPlaceName==mapPlaceName) {
                placeProxies[instPlaceName]=placeProxy;              
            }
        }
    }
    return placeProxies;
};