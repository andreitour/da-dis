function loadSvgTemplate(templateFileName,svgContainerNode,afterLoadCallback) {
    var defaultTemplateFileName = "svg_template.svg";
    if(!templateFileName) templateFileName = defaultTemplateFileName;
    var fullFileName =  "templates/" + templateFileName;
    d3.xml(fullFileName).then(function(svgDoc){
        d3.select(svgContainerNode).html(svgDoc.documentElement.outerHTML);

        var tInfo = {};
        tInfo.svgNode = d3.select(svgContainerNode).select("svg")
            .style("width","100%")
            .style("height","auto")
            .node();

        packageSvgNode(tInfo);
              
        if(afterLoadCallback) {
            afterLoadCallback(tInfo);
        }
    });                    
};

function getSvgNodeDaDisProps(node) {
    var dadisProps = {};
    var propsNode = node.getElementsByTagName("v:custprops")[0];
    if(propsNode) {
        var propNodes = propsNode.getElementsByTagName("v:cp");
        for (var i=0;i<propNodes.length;i++) {
            var propNode = propNodes[i];
            var type,name;
            var propName = propNode.getAttribute("v:nameu").toLowerCase();
            if(propName.startsWith(_config.ns)) {
                var propVal = propNode.getAttribute("v:val"); 
                propVal = propVal.substring(4,propVal.length-1);
                if(propVal) {
                    dadisProps[propName] = propVal;
                }
            }
        }
    };
    return dadisProps;
};

function moveSvgNodedadisPropsToAttrs(node) {
    var dadisProps = getSvgNodeDaDisProps(node);
    if(dadisProps[_config.ns+"_name"]) {
        d3.select(node).attr("name",dadisProps[_config.ns+"_name"]);
    }
    if(dadisProps[_config.ns+"_type"]) {
        d3.select(node).classed(dadisProps[_config.ns+"_type"],true);
        d3.select(node).attr("dadis-type",dadisProps[_config.ns+"_type"]);
    }
    if(dadisProps[_config.ns+"_dataclass"]) {
        d3.select(node).attr("dadis-dataclass",dadisProps[_config.ns+"_dataclass"]);
    }
};

function removeSvgVisioAtributesAndSubNodes(node) {
    var attrsToRemove = [];
    for (var i = 0; i < node.attributes.length; i++) {
        var attr = node.attributes[i];
        if(attr.name.startsWith("v:")) {
            attrsToRemove.push(attr.name);
        }
    }
    for (var i=0;i<attrsToRemove.length;i++) {
        var attrName = attrsToRemove[i];
        node.removeAttribute(attrName);
    }
    var subNodesToRemove = [];
    for (var i = 0; i < node.children.length; i++) {
        var childNode = node.children[i];
        if(childNode.nodeName.startsWith("v:")) {
            subNodesToRemove.push(childNode);
        }
        else {
            removeSvgVisioAtributesAndSubNodes(childNode);
        }
    }
    for (var i=0;i<subNodesToRemove.length;i++) {
        var subNode = subNodesToRemove[i];
        node.removeChild(subNode);
    }
};

function getSvgStateStyles(stylesPageSel) {
    // discover css classes for different element states
    var styles = {};
    stylesPageSel.selectAll("[class]").each(function(d,i){
        var shapeProps = getSvgNodeDaDisProps(this.parentNode);
        var placeProps = getSvgNodeDaDisProps(this.parentNode.parentNode);
        if(placeProps[_config.ns+"_style"] && shapeProps[_config.ns+"_type"]) {
            if(!styles[shapeProps[_config.ns+"_type"]]) {
                styles[shapeProps[_config.ns+"_type"]] = {};
            }
            if(!styles[shapeProps[_config.ns+"_type"]][this.nodeName]) {
                styles[shapeProps[_config.ns+"_type"]][this.nodeName] = {};
            }
            styles[shapeProps[_config.ns+"_type"]][this.nodeName][placeProps[_config.ns+"_style"].toLowerCase()] = this.getAttribute("class");        
        }
    });    
    return styles;
}

function packageSvgNode(svgInfo) {
    var svgSel = d3.select(svgInfo.svgNode);

    svgInfo.viewBox = svgSel.attr("viewBox");
    svgInfo.class = svgSel.attr("class");

    // performed for all pages
    svgSel.selectAll("g").each(function(d,i){
        moveSvgNodedadisPropsToAttrs(this);
    });

    svgSel.selectAll("svg > g").each(function(d,i) {
        var pSel = d3.select(this);
        if(pSel.select("title")) {
            var pageName = pSel.select("title").text();
            pSel.attr("name",pageName);
            console.log("Detected page:" + pageName);

            if(pageName=="Styles") {
                svgInfo.styles = getSvgStateStyles(pSel);
                pSel.style("display","none");
            } 
            else if(pageName.indexOf("Legend - ")==0){
                // this is a view legend, lets extract some view specific dataclasses
                pSel.classed("dadis-view",true);
                var viewName = pageName.slice(9); // Chop "Legend - " off
                if(!svgInfo.views) svgInfo.views = {};
                svgInfo.views[viewName] ={tagTemplateNodes:{}};
                pSel.selectAll("g.tag-group").each(function(d,i){
                    var tagTemplateSel = d3.select(this); 
                    var dataclass = tagTemplateSel.attr("dadis-dataclass");
                    svgInfo.views[viewName].tagTemplateNodes[dataclass] = tagTemplateSel.node();
                    var n = svgInfo.views[viewName].tagTemplateNodes[dataclass];
                });
                pSel.style("display","none");
            }
            else {
                // nothing special to do with the Map and Background pages
            }
        }

    });
    
    // performed for all pages
    removeSvgVisioAtributesAndSubNodes(svgInfo.svgNode);
    svgSel.selectAll("title, desc").remove();        
    
    return svgInfo;
};