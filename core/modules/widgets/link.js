/*\
title: $:/core/modules/widgets/link.js
type: application/javascript
module-type: widget

Link widget

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;
var MISSING_LINK_CONFIG_TITLE = "$:/config/MissingLinks";

var LinkWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
LinkWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
LinkWidget.prototype.render = function(parent,nextSibling) {
	// Save the parent dom node
	this.parentDomNode = parent;
	// Compute our attributes
	this.computeAttributes();
	// Execute our logic
	this.execute();
	// Get the value of the tv-wikilinks configuration macro
	var wikiLinksMacro = this.getVariable("tv-wikilinks"),
		useWikiLinks = wikiLinksMacro ? (wikiLinksMacro.trim() !== "no") : true,
		missingLinksEnabled = !(this.hideMissingLinks && this.isMissing && !this.isShadow);
	// Render the link if required
	if(useWikiLinks && missingLinksEnabled) {
		this.renderLink(parent,nextSibling);
	} else {
		// Just insert the link text
		var domNode = this.document.createElement("span");
		parent.insertBefore(domNode,nextSibling);
		this.renderChildren(domNode,null);
		this.domNodes.push(domNode);
	}
};

/*
Render this widget into the DOM
*/
LinkWidget.prototype.renderLink = function(parent,nextSibling) {
	var self = this;
	// Sanitise the specified tag
	var tag = this.linkTag;
	if($tw.config.htmlUnsafeElements.indexOf(tag) !== -1) {
		tag = "a";
	}
	// Create our element
	var domNode = this.document.createElement(tag);
	// Assign classes
	var classes = [];
	if(this.linkClasses) {
		classes.push(this.linkClasses);
	}
	classes.push("tc-tiddlylink");
	if(this.isShadow) {
		classes.push("tc-tiddlylink-shadow");
	}
	if(this.isMissing && !this.isShadow) {
		classes.push("tc-tiddlylink-missing");
	} else {
		if(!this.isMissing) {
			classes.push("tc-tiddlylink-resolves");
		}
	}
	domNode.setAttribute("class",classes.join(" "));
	// Set an href
	var wikiLinkTemplateMacro = this.getVariable("tv-wikilink-template"),
		wikiLinkTemplate = wikiLinkTemplateMacro ? wikiLinkTemplateMacro.trim() : "#$uri_encoded$",
		wikiLinkText = $tw.utils.replaceString(wikiLinkTemplate,"$uri_encoded$",encodeURIComponent(this.to));
	wikiLinkText = $tw.utils.replaceString(wikiLinkText,"$uri_doubleencoded$",encodeURIComponent(encodeURIComponent(this.to)));
	wikiLinkText = this.getVariable("tv-get-export-link",{params: [{name: "to",value: this.to}],defaultValue: wikiLinkText});
	if(tag === "a") {
		domNode.setAttribute("href",wikiLinkText);
	}
	if(this.tabIndex) {
		domNode.setAttribute("tabindex",this.tabIndex);
	}
	// Set the tooltip
	// HACK: Performance issues with re-parsing the tooltip prevent us defaulting the tooltip to "<$transclude field='tooltip'><$transclude field='title'/></$transclude>"
	var tooltipWikiText = this.tooltip || this.getVariable("tv-wikilink-tooltip");
	if(tooltipWikiText) {
		var tooltipText = this.wiki.renderText("text/plain","text/vnd.tiddlywiki",tooltipWikiText,{
				parseAsInline: true,
				variables: {
					currentTiddler: this.to
				},
				parentWidget: this
			});
		domNode.setAttribute("title",tooltipText);
	}
	if(this["aria-label"]) {
		domNode.setAttribute("aria-label",this["aria-label"]);
	}
	// Add a click event handler
	$tw.utils.addEventListeners(domNode,[
		{name: "click", handlerObject: this, handlerMethod: "handleClickEvent"},
	]);
	// Make the link draggable if required
	if(this.draggable === "yes") {
		$tw.utils.makeDraggable({
			domNode: domNode,
			dragTiddlerFn: function() {return self.to;},
			widget: this
		});
	}
	// Insert the link into the DOM and render any children
	parent.insertBefore(domNode,nextSibling);
	this.renderChildren(domNode,null);
	this.domNodes.push(domNode);
};

LinkWidget.prototype.handleClickEvent = function(event) {
	// Send the click on its way as a navigate event
	var bounds = this.domNodes[0].getBoundingClientRect();
	this.dispatchEvent({
		type: "tm-navigate",
		navigateTo: this.to,
		navigateFromTitle: this.getVariable("storyTiddler"),
		navigateFromNode: this,
		navigateFromClientRect: { top: bounds.top, left: bounds.left, width: bounds.width, right: bounds.right, bottom: bounds.bottom, height: bounds.height
		},
		navigateSuppressNavigation: event.metaKey || event.ctrlKey || (event.button === 1),
		metaKey: event.metaKey,
		ctrlKey: event.ctrlKey,
		altKey: event.altKey,
		shiftKey: event.shiftKey
	});
	if(this.domNodes[0].hasAttribute("href")) {
		event.preventDefault();
	}
	event.stopPropagation();
	return false;
};

/*
Compute the internal state of the widget
*/
LinkWidget.prototype.execute = function() {
	// Pick up our attributes
	this.to = this.getAttribute("to",this.getVariable("currentTiddler"));
	this.tooltip = this.getAttribute("tooltip");
	this["aria-label"] = this.getAttribute("aria-label");
	this.linkClasses = this.getAttribute("class");
	this.tabIndex = this.getAttribute("tabindex");
	this.draggable = this.getAttribute("draggable","yes");
	this.linkTag = this.getAttribute("tag","a");
	// Determine the link characteristics
	this.isMissing = !this.wiki.tiddlerExists(this.to);
	this.isShadow = this.wiki.isShadowTiddler(this.to);
	this.hideMissingLinks = ($tw.wiki.getTiddlerText(MISSING_LINK_CONFIG_TITLE,"yes") === "no");
	// Make the child widgets
	this.makeChildWidgets();
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
LinkWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	if(changedAttributes.to || changedTiddlers[this.to] || changedAttributes["aria-label"] || changedAttributes.tooltip || changedTiddlers[MISSING_LINK_CONFIG_TITLE]) {
		this.refreshSelf();
		return true;
	}
	return this.refreshChildren(changedTiddlers);
};

exports.link = LinkWidget;

})();
