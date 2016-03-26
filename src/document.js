'use strict';

var cssom = require('cssom');


var Attr = require('./attr');
var Comment = require('./comment');
var DocumentType = require('./document-type');
var HTMLElement = require('./html-element');
var Node = require('./node');
var Text = require('./text');
var StyleSheetList = require('./style-sheet-list');


var HTMLAnchorElement = require('./elements').HTMLAnchorElement;
var HTMLImageElement = require('./elements').HTMLImageElement;
var HTMLLinkElement = require('./elements').HTMLLinkElement;
var HTMLFormElement = require('./elements').HTMLFormElement;
var HTMLButtonElement = require('./elements').HTMLButtonElement;
var HTMLInputElement = require('./elements').HTMLInputElement;
var HTMLSelectElement = require('./elements').HTMLSelectElement;
var HTMLOptionElement = require('./elements').HTMLOptionElement;
var HTMLTextAreaElement = require('./elements').HTMLTextAreaElement;



function Document(options) {
    Node.call(this, this, '#document', null, Node.DOCUMENT_NODE);
    this.defaultView = {};
    this._doctype = null;
    this._documentElement = null;
    this._styleSheets = null;
    this._parserAdapter = options.parserAdapter;
    this._baseURI = options.baseURI || '';
}

Document.prototype = Object.create(Node.prototype, {
    baseURI: {
        get: function() {
            var base = this.getElementsByTagName('base').item(0);
            if (base) {
                return base.getAttribute('href');
            } else {
                return this._baseURI;
            }
        }
    },
    doctype: {
        get: function() {
            return this._doctype;
        }
    },
    compatMode: {
        get: function() {
            return 'CSS1Compat';
        }
    },
    documentElement: {
        get: function() {
            if (this._documentElement) {
                return this._documentElement;
            } else {
                var child = this._first;
                while (child) {
                    if (child.nodeType === Node.ELEMENT_NODE) {
                        return this._documentElement = child;
                    }
                    child = child._next;
                }
                return null;
            }
        }
    },
    head: {
        get: function() {
            return this.getElementsByTagName('head').item(0);
        }
    },
    title: {
        get: function() {
            return this.getElementsByTagName('title').item(0).textContent;
        }
    },
    body: {
        get: function() {
            return this.getElementsByTagName('body').item(0);
        }
    },
    styleSheets: {
        get: function() {
            if (!this._styleSheets) {
                this._styleSheets = new StyleSheetList();

                var nodeList = this.querySelectorAll('style,link[rel=stylesheet]:not([disabled])');

                for (var i = 0; i < nodeList.length; i++) {

                    var ownerNode = nodeList.item(i);
                    var textContent = ownerNode.textContent;
                    var cssStyleSheet = cssom.parse(textContent);

                    if (ownerNode.nodeName === 'LINK') {
                        cssStyleSheet.cssRules = null;
                    }

                    cssStyleSheet.ownerNode = ownerNode;
                    this._styleSheets.push(cssStyleSheet);
                }
            }
            return this._styleSheets;
        }
    }
});

Document.prototype.constructor = Document;

Document.prototype.createElement = function(tagName) {
    var namespaceURI = this.documentElement.namespaceURI;
    return this.createElementNS(namespaceURI, tagName);
};

Document.prototype.createElementNS = function(namespaceURI, tagName) {
    tagName = tagName.toUpperCase();
    var Constructor;

    switch (tagName) {
        case 'A':
            Constructor = HTMLAnchorElement;
            break;
        case 'IMG':
            Constructor = HTMLImageElement;
            break;
        case 'LINK':
            Constructor = HTMLLinkElement;
            break;
        case 'FORM':
            Constructor = HTMLFormElement;
            break;
        case 'BUTTON':
            Constructor = HTMLButtonElement;
            break;
        case 'INPUT':
            Constructor = HTMLInputElement;
            break;
        case 'SELECT':
            Constructor = HTMLSelectElement;
            break;
        case 'OPTION':
            Constructor = HTMLOptionElement;
            break;
        case 'TEXTAREA':
            Constructor = HTMLTextAreaElement;
            break;
        default:
            Constructor = HTMLElement;
    }

    return new Constructor(this, tagName, namespaceURI);
};

Document.prototype.createDocumentFragment = function() {
    throw new Error('not yet implemented');
};

Document.prototype.createTextNode = function(data) {
    return new Text(this, data);
};

Document.prototype.createComment = function(data) {
    return new Comment(this, data);
};

Document.prototype.createAttribute = function(name) {
    return new Attr(this, name, false, '');
};

Document.prototype.getElementsByTagName = function(tagName) {
    return HTMLElement.prototype.getElementsByTagName.call(this, tagName);
};

// TODO restrict to just Element types
// TODO 性能优化
Document.prototype.getElementById = function(id) {
    var child = this.firstChild;

    out: while (child) {
        if (child.id === id) {
            return child;
        }
        if (child.firstChild) {
            child = child.firstChild;
        } else if (child.nextSibling) {
            child = child.nextSibling;
        } else {
            do {
                child = child.parentNode;
                if (child === this) break out;
            } while (!child.nextSibling);
            child = child.nextSibling;
        }
    }

    return null;
};

Document.prototype.querySelector = function(selector) {
    return HTMLElement.prototype.querySelector.call(this, selector);
};

Document.prototype.querySelectorAll = function(selector) {
    return HTMLElement.prototype.querySelectorAll.call(this, selector);
};


Document.prototype._setDocumentType = function(name, publicId, systemId) {
    this._doctype = new DocumentType(this, name, publicId, systemId);
};


module.exports = Document;