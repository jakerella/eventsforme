Ext.define('Events.util.Helper', {
  singleton: true,
  alternateClassName: 'Helper',
  config: {
    today: null,
    dateYmd: null,
    tomorrow: null,
    week: null,
    sevenDays: null,
    navBar: null,
    screenTitle: null,
    saveButton: null,
    removeButton: null,
    mapButton: null,
    backBtn: null,
    maxResults: 50,
    defDist: 10,
    defDays: 7
  },

  // Dealing with Views (and the UI in general)

  addView: function(view, app) {
    var v;
    if (view.id) {
      v = Ext.Viewport.getComponent(view.id);
    }

    if (!v) {
      v = Ext.Viewport.add(view);
      console.log('new view added', v);
    }

    if (v.config.title && v.config.title.length) {
      this.getScreenTitle().setTitle(v.config.title);
    }
    // Hide titlebar buttons by default
    this.getSaveButton().setHidden(true);
    this.getRemoveButton().setHidden(true);
    this.getMapButton().setHidden(true);

    // Set the view as active (if it's not already)
    var curr = Ext.Viewport.getActiveItem();
    if (curr != v) {
      // Show our new view
      
      // detect if this is a forward, back or new view and change direction accordingly
      var dir = 'left';
      if (v.config.hash) {
        var ni = 999;
        var oi = 0;
        Ext.each(app.getHistory().getActions(), function(a, i) {
          if (a.getUrl() == v.config.hash || app.routeAliases[a.getUrl()] == v.config.hash) {
            ni = i;
          } else  if (curr.config.hash && (a.getUrl() == curr.config.hash || app.routeAliases[a.getUrl()] == curr.config.hash)) {
            oi = i;
          }
        });
        dir = (ni > oi)?'left':'right';
      }

      Ext.Viewport.animateActiveItem(v, {type: 'slide', direction: dir});
    }

    var u = this;
    setTimeout(function() {
      // show/hide back button based on History object
      var firstAction = (app.getHistory().getActions()[0].getUrl() == app.getHistory().getToken());
      u.getBackButton().setHidden(firstAction);
    }, 200);

    return v;
  },

  setLoading: function(loading) {
    if (!!loading) {
      Ext.Viewport.setMasked({
        xtype: 'loadmask',
        message: 'Finding events...'
      });
    } else {
      Ext.Viewport.setMasked(false);
    }
  },

  // Getters/Setters for static components
  
  getScreenTitle: function() {
    if (!this.screenTitle) {
      this.screenTitle = Ext.Viewport.getDockedComponent('screen-title');
    }
    return this.screenTitle;
  },

  getSaveButton: function() {
    if (!this.saveButton) {
      this.saveButton = this.getScreenTitle().getAt(2).getComponent('save-event');
    }
    return this.saveButton;
  },

  getRemoveButton: function() {
    if (!this.removeButton) {
      this.removeButton = this.getScreenTitle().getAt(2).getComponent('remove-event');
    }
    return this.removeButton;
  },

  getMapButton: function() {
    if (!this.mapButton) {
      this.mapButton = this.getScreenTitle().getAt(2).getComponent('map-events');
    }
    return this.mapButton;
  },

  getNavBar: function() {
    if (!this.navBar) {
      this.navBar = Ext.Viewport.getDockedComponent('app-nav');
    }
    return this.navBar;
  },

  getBackButton: function() {
    if (!this.backBtn) {
      this.backBtn = this.getScreenTitle().getAt(0).getComponent('nav-back');
    }
    return this.backBtn;
  },

  setActiveTab: function(t) {
    if (t && t.length) {
      this.getNavBar().setActiveTab('nav-'+t);
      this.getNavBar().getActiveTab().setActive(true); // just to be sure it's marked properly
    } else {
      var at = this.getNavBar().getActiveTab();
      if (at) { at.setActive(false); }
    }
  },


  // Date functions
  
  getDateTimeRange: function(start, end) {
    if (!start) { return ""; }
    
    var md = this.isMultiDay(start, end);
    var st = this.hasTime(start);
    var et = this.hasTime(end);

    var r = this.getFuzzyDay(start);
    if (st) {
      if (md && et) {
        r += " at ";
      } else if (et) {
        r += " from ";
      } else {
        r += " at ";
      }
      r += Ext.Date.format(start, 'g:ia');
    }
    if (md) {
      r += " to "+this.getFuzzyDay(end);
      if (this.hasTime(end)) {
        r += " at "+Ext.Date.format(end, 'g:ia');
      }
    } else if (st && et) {
      r += " to "+Ext.Date.format(end, 'g:ia');
    }
    return r;
  },

  getFuzzyDay: function(d) {
    if (!this.today) {
      this.today = new Date();
      this.dateYmd = Ext.Date.format(this.today, "Y-m-d");
      this.tomorrow = Ext.Date.format(Ext.Date.add(this.today, 'd', 1), 'Y-m-d');
      this.week = Ext.Date.format(this.today, 'Y-W');
      this.sevenDays = Ext.Date.format(Ext.Date.add(this.today, 'd', 7), 'Y-m-d');
    }

    var date = Ext.Date.format(d, "Y-m-d");
    if (date == this.dateYmd) {
      return "Today";
    } else if (date == this.tomorrow) {
      return "Tomorrow";
    } else if (Ext.Date.format(d, "Y-W") == this.week ||
               date < this.sevenDays) {
      return Ext.Date.format(d, "l");
    } else if (d.getFullYear() == this.today.getFullYear()) {
      return Ext.Date.format(d, "M j");
    } else {
      return Ext.Date.format(d, "M j, Y");
    }
  },

  hasTime: function(d) {
    if (!d) { return false; }
    var t = Ext.Date.format(d, 'H:i:s');
    return (t != '00:00:00' && t != '23:59:59');
  },

  isMultiDay: function(start, end) {
    if (!end) { return false; }
    if (Ext.Date.format(start, 'Y-m-d') == Ext.Date.format(end, 'Y-m-d')) {
      return false;
    }
    return true;
  },

  
  // Misc Other Functions
  
  getDefParams: function() {
    return {'terms': '', 'loc': '', 'time': this.config.defDays, 'dist': this.config.defDist};
  },
  
  isProd: function() {
    return ((/^test\./.test(Ext.namespace().location.host))?true:false);
  },

  getBaseUrl: function() {
    return Ext.namespace().location.protocol+'//'+Ext.namespace().location.host;
  },

  // Perform a deep comparison to check if two objects are equal.
  isEqual: function(a, b) {
    return this.__eq(a, b, [], []);
  },
  // Internal recursive comparison function for 'isEqual'
  // Derived from underscore.js library: https://github.com/documentcloud/underscore/blob/master/underscore.js
  __eq: function(a, b, aStack, bStack) {
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    if (a == null || b == null) return a === b;
    var c = toString.call(a);
    if (c != toString.call(b)) return false;
    switch (c) {
      case '[object String]':
        return a == String(b);
      case '[object Number]':
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        return +a == +b;
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    var length = aStack.length;
    while (length--) {
      if (aStack[length] == a) return bStack[length] == b;
    }
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    if (c == '[object Array]') {
      size = a.length;
      result = size == b.length;
      if (result) {
        while (size--) {
          if (!(result = this.__eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(Ext.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               Ext.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      for (var k in a) {
        if (hasOwnProperty.call(a, k)) {
          size++;
          if (!(result = hasOwnProperty.call(b, k) && this.__eq(a[k], b[k], aStack, bStack))) break;
        }
      }
      if (result) {
        for (k in b) {
          if (hasOwnProperty.call(b, k) && !(size--)) break;
        }
        result = !size;
      }
    }
    aStack.pop();
    bStack.pop();
    return result;
  },


  // Text handling
  
  escapeHtmlEntities: function (text) {
    var u = this;
    return text.replace(/[\u00A0-\u2666<>\&]/g, function(c) {
      return '&' + 
      (u.entityTable[c.charCodeAt(0)] || '#'+c.charCodeAt(0)) + ';';
    });
  },
  // all HTML4 entities as defined here: http://www.w3.org/TR/html4/sgml/entities.html
  entityTable: {
    34 : 'quot', 
    38 : 'amp', 
    39 : 'apos', 
    60 : 'lt', 
    62 : 'gt', 
    160 : 'nbsp', 
    161 : 'iexcl', 
    162 : 'cent', 
    163 : 'pound', 
    164 : 'curren', 
    165 : 'yen', 
    166 : 'brvbar', 
    167 : 'sect', 
    168 : 'uml', 
    169 : 'copy', 
    170 : 'ordf', 
    171 : 'laquo', 
    172 : 'not', 
    173 : 'shy', 
    174 : 'reg', 
    175 : 'macr', 
    176 : 'deg', 
    177 : 'plusmn', 
    178 : 'sup2', 
    179 : 'sup3', 
    180 : 'acute', 
    181 : 'micro', 
    182 : 'para', 
    183 : 'middot', 
    184 : 'cedil', 
    185 : 'sup1', 
    186 : 'ordm', 
    187 : 'raquo', 
    188 : 'frac14', 
    189 : 'frac12', 
    190 : 'frac34', 
    191 : 'iquest', 
    192 : 'Agrave', 
    193 : 'Aacute', 
    194 : 'Acirc', 
    195 : 'Atilde', 
    196 : 'Auml', 
    197 : 'Aring', 
    198 : 'AElig', 
    199 : 'Ccedil', 
    200 : 'Egrave', 
    201 : 'Eacute', 
    202 : 'Ecirc', 
    203 : 'Euml', 
    204 : 'Igrave', 
    205 : 'Iacute', 
    206 : 'Icirc', 
    207 : 'Iuml', 
    208 : 'ETH', 
    209 : 'Ntilde', 
    210 : 'Ograve', 
    211 : 'Oacute', 
    212 : 'Ocirc', 
    213 : 'Otilde', 
    214 : 'Ouml', 
    215 : 'times', 
    216 : 'Oslash', 
    217 : 'Ugrave', 
    218 : 'Uacute', 
    219 : 'Ucirc', 
    220 : 'Uuml', 
    221 : 'Yacute', 
    222 : 'THORN', 
    223 : 'szlig', 
    224 : 'agrave', 
    225 : 'aacute', 
    226 : 'acirc', 
    227 : 'atilde', 
    228 : 'auml', 
    229 : 'aring', 
    230 : 'aelig', 
    231 : 'ccedil', 
    232 : 'egrave', 
    233 : 'eacute', 
    234 : 'ecirc', 
    235 : 'euml', 
    236 : 'igrave', 
    237 : 'iacute', 
    238 : 'icirc', 
    239 : 'iuml', 
    240 : 'eth', 
    241 : 'ntilde', 
    242 : 'ograve', 
    243 : 'oacute', 
    244 : 'ocirc', 
    245 : 'otilde', 
    246 : 'ouml', 
    247 : 'divide', 
    248 : 'oslash', 
    249 : 'ugrave', 
    250 : 'uacute', 
    251 : 'ucirc', 
    252 : 'uuml', 
    253 : 'yacute', 
    254 : 'thorn', 
    255 : 'yuml', 
    402 : 'fnof', 
    913 : 'Alpha', 
    914 : 'Beta', 
    915 : 'Gamma', 
    916 : 'Delta', 
    917 : 'Epsilon', 
    918 : 'Zeta', 
    919 : 'Eta', 
    920 : 'Theta', 
    921 : 'Iota', 
    922 : 'Kappa', 
    923 : 'Lambda', 
    924 : 'Mu', 
    925 : 'Nu', 
    926 : 'Xi', 
    927 : 'Omicron', 
    928 : 'Pi', 
    929 : 'Rho', 
    931 : 'Sigma', 
    932 : 'Tau', 
    933 : 'Upsilon', 
    934 : 'Phi', 
    935 : 'Chi', 
    936 : 'Psi', 
    937 : 'Omega', 
    945 : 'alpha', 
    946 : 'beta', 
    947 : 'gamma', 
    948 : 'delta', 
    949 : 'epsilon', 
    950 : 'zeta', 
    951 : 'eta', 
    952 : 'theta', 
    953 : 'iota', 
    954 : 'kappa', 
    955 : 'lambda', 
    956 : 'mu', 
    957 : 'nu', 
    958 : 'xi', 
    959 : 'omicron', 
    960 : 'pi', 
    961 : 'rho', 
    962 : 'sigmaf', 
    963 : 'sigma', 
    964 : 'tau', 
    965 : 'upsilon', 
    966 : 'phi', 
    967 : 'chi', 
    968 : 'psi', 
    969 : 'omega', 
    977 : 'thetasym', 
    978 : 'upsih', 
    982 : 'piv', 
    8226 : 'bull', 
    8230 : 'hellip', 
    8242 : 'prime', 
    8243 : 'Prime', 
    8254 : 'oline', 
    8260 : 'frasl', 
    8472 : 'weierp', 
    8465 : 'image', 
    8476 : 'real', 
    8482 : 'trade', 
    8501 : 'alefsym', 
    8592 : 'larr', 
    8593 : 'uarr', 
    8594 : 'rarr', 
    8595 : 'darr', 
    8596 : 'harr', 
    8629 : 'crarr', 
    8656 : 'lArr', 
    8657 : 'uArr', 
    8658 : 'rArr', 
    8659 : 'dArr', 
    8660 : 'hArr', 
    8704 : 'forall', 
    8706 : 'part', 
    8707 : 'exist', 
    8709 : 'empty', 
    8711 : 'nabla', 
    8712 : 'isin', 
    8713 : 'notin', 
    8715 : 'ni', 
    8719 : 'prod', 
    8721 : 'sum', 
    8722 : 'minus', 
    8727 : 'lowast', 
    8730 : 'radic', 
    8733 : 'prop', 
    8734 : 'infin', 
    8736 : 'ang', 
    8743 : 'and', 
    8744 : 'or', 
    8745 : 'cap', 
    8746 : 'cup', 
    8747 : 'int', 
    8756 : 'there4', 
    8764 : 'sim', 
    8773 : 'cong', 
    8776 : 'asymp', 
    8800 : 'ne', 
    8801 : 'equiv', 
    8804 : 'le', 
    8805 : 'ge', 
    8834 : 'sub', 
    8835 : 'sup', 
    8836 : 'nsub', 
    8838 : 'sube', 
    8839 : 'supe', 
    8853 : 'oplus', 
    8855 : 'otimes', 
    8869 : 'perp', 
    8901 : 'sdot', 
    8968 : 'lceil', 
    8969 : 'rceil', 
    8970 : 'lfloor', 
    8971 : 'rfloor', 
    9001 : 'lang', 
    9002 : 'rang', 
    9674 : 'loz', 
    9824 : 'spades', 
    9827 : 'clubs', 
    9829 : 'hearts', 
    9830 : 'diams', 
    338 : 'OElig', 
    339 : 'oelig', 
    352 : 'Scaron', 
    353 : 'scaron', 
    376 : 'Yuml', 
    710 : 'circ', 
    732 : 'tilde', 
    8194 : 'ensp', 
    8195 : 'emsp', 
    8201 : 'thinsp', 
    8204 : 'zwnj', 
    8205 : 'zwj', 
    8206 : 'lrm', 
    8207 : 'rlm', 
    8211 : 'ndash', 
    8212 : 'mdash', 
    8216 : 'lsquo', 
    8217 : 'rsquo', 
    8218 : 'sbquo', 
    8220 : 'ldquo', 
    8221 : 'rdquo', 
    8222 : 'bdquo', 
    8224 : 'dagger', 
    8225 : 'Dagger', 
    8240 : 'permil', 
    8249 : 'lsaquo', 
    8250 : 'rsaquo', 
    8364 : 'euro'
  }
});