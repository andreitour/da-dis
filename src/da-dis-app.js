// VUE-----------------------------------           
var _app = new Vue({
    el: '#app',
    data: {
        mode: "main",
        // the Model Interchange Data (MID) dataset generated by the DA-DIS EA export-mid-csv plug-in
        mid: {
            els: [],
            cons: [],
            tags: []
        },
        // The Visualisation Data (VD) is a datastructure derived from the MID and optimized for the real-time architecture view generation 
        vd: {
            ready: false,
            el:{},
            con:{},
            type: {
                "mop":{},
                "moe":{},
                "node":{},
                "link":{},
                "topology":{},
                "configuration state":{}
            }
        },
        viewFrame: {
            viewContainerNode: null,
            views: _config.views,
            activeViewName: null,
            loadedViewTemplates: {}
        },
        selection: {
            viewName: null,
            filter: {
                instTypeName: null,
                instClassName: null,
                instCsName: null,
                instPlaceName: null
            },
        },
        selectionOptions: {
            viewName: [],
            instTypeName: [],
            instClassName: [],
            instCsName: [],
            instPlaceName: []
        }
    },
    methods: {
        processPageURI: function() {
            var requestedMode = window.location.hash.slice(1);
            this.mode = requestedMode ? requestedMode : "main";
            var selectionJson = decodeURIComponent(window.location.search).slice(1);
            if(selectionJson) {
                try {
                    this.selection = JSON.parse(selectionJson);
                } catch (e) {
                    console.log("unprocessed da-dis filter:'"+selectionJson+"'");
                }
            }
        },
        initViewFrame: function(appMode) {
            if(appMode=="all" || appMode=="print") {
                if(!this.viewFrame.views["All Instances"]) {
                    this.viewFrame.views["All Instances"] = new SvgMapInstView();
                }
            }
            
            var modeSectionSel;
            if (appMode=="print") {
                modeSectionSel = d3.select("#print-section");
            }
            else {
                modeSectionSel = d3.select("#main-section");
            }
            var svgContainerSel = modeSectionSel.select(".svg-container");
            this.viewFrame.viewContainerNode = svgContainerSel.node();
            modeSectionSel.style("visibility", "visible");

            // set the 1st configured view as active, "Error - No Views configured" if no views configured
            var allViewNames = Object.keys(this.viewFrame.views);
            if(allViewNames.length>0) {
                if(!this.selection.viewName ) this.selection.viewName = allViewNames[0];
            } 

            this.selectionOptions.viewName = Object.keys(this.viewFrame.views);  
            if(this.selectionOptions.viewName.length>0) {
                if(!this.selection.viewName ) this.selection.viewName = allViewNames[0];
            } 
            if(this.selection.viewName) {
                this.activateView(this.selection.viewName);
            }          
        },
        activateView: function(viewName) {
            var _this = this;
            if(this.viewFrame.activeViewName==viewName) return;
            if(this.viewFrame.activeViewName) {
                // de-activate the current active view
                var activeView = this.viewFrame.views[this.viewFrame.activeViewName];
                var activeTemplateInfo = this.viewFrame.loadedViewTemplates[activeView.templateFileName];
                d3.select(activeTemplateInfo.svgNode).style("display","none");
                this.viewFrame.activeViewName = null;                                
            }
            var view = this.viewFrame.views[viewName];
            var finishViewActivation = function(tInfo) {
                _this.viewFrame.activeViewName = viewName;
                d3.select(tInfo.svgNode).style("display","block");
                d3.select(tInfo.svgNode).selectAll("g.dadis-view").style("display","none");
                d3.select(tInfo.svgNode).select('g.dadis-view[name="Legend - '+viewName+'"]').style("display","block");
                view.viewName = viewName;
                view.templateInfo = tInfo;
                view.configureFrame(_this);
                view.updateView(_this);
            };
            var templateInfo = _this.viewFrame.loadedViewTemplates[view.templateFileName];
            if(!templateInfo) {
                loadSvgTemplate(view.templateFileName,this.viewFrame.viewContainerNode,function(newTemplateInfo){
                    _this.viewFrame.loadedViewTemplates[view.templateFileName] = newTemplateInfo;
                    finishViewActivation(newTemplateInfo);                
                });
            } else {
                finishViewActivation(templateInfo);
            }
        },
        updateActiveView: function() {
            var viewName = this.viewFrame.activeViewName;
            if(viewName) {
                var view = this.viewFrame.views[viewName]; 
                view.updateView(this);
            }
        },
        updatePlaceSelection: function(placeName) {
            var viewName = this.viewFrame.activeViewName;
            if(viewName) {
                var view = this.viewFrame.views[viewName]; 
                view.updateSvgSelection(this);
            }
        },

        onPrint: function (event) {
            var printURL = window.location.href.split("#")[0];
            if(window.location.search.split("?")[1]) {
                printURL = printURL.split("?")[0];
            }
            printURL = printURL + "?" + encodeURIComponent(JSON.stringify(_app.selection)) + "#print";
            window.open(printURL, "_blank");
        },
        onFilterChange: function (event) {
            this.updateActiveView();
        },
        onPlaceChange: function(event) {
            this.updatePlaceSelection(_app);
        },
        onViewChange: function(event) {
            this.activateView(this.selection.viewName);
        }
    },

    mounted: function () {
        this.processPageURI();
        var _this = this;
        loadData(this.mid,this.vd,function(){
            _this.initViewFrame(_this.mode);
        });
    }
});

