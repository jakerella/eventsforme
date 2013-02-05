//<debug>
Ext.Loader.setPath({
  'Ext': 'touch/src',
  'Events': 'app'
});
//</debug>

Ext.application({
  name: 'Events',

  requires: [ 'Ext.MessageBox', 'Ext.navigation.View' ],

  controllers: ['Event', 'Static', 'Error'],
  views: ['Nav', 'EventList', 'EventView', 'Search', 'ErrorView'],
  models: ['Event'],
  stores: ['LocalEvents'],

  icon: {
    '57': 'resources/icons/Icon.png',
    '72': 'resources/icons/Icon~ipad.png',
    '114': 'resources/icons/Icon@2x.png',
    '144': 'resources/icons/Icon~ipad@2x.png'
  },
  isIconPrecomposed: true,
  startupImage: {
    '320x460': 'resources/startup/320x460.jpg',
    '640x920': 'resources/startup/640x920.png',
    '768x1004': 'resources/startup/768x1004.png',
    '748x1024': 'resources/startup/748x1024.png',
    '1536x2008': 'resources/startup/1536x2008.png',
    '1496x2048': 'resources/startup/1496x2048.png'
  },

  launch: function() {
    // Destroy the #appLoadingIndicator element
    Ext.fly('appLoadingIndicator').destroy();
    
    Ext.Viewport.add([
      {
        xtype: 'toolbar',
        title: 'Find Some Events',
        id: 'screen-title',
        docked: "top",
        items: [
          {
            xtype: 'button',
            id: 'nav-back',
            ui: 'back',
            text: 'Back',
            hidden: true,
            handler: function() {
              console.log('back button tapped');
              history.back();
            }
          }
        ]
      },
      {
        xtype: 'eventsnav',
        id: 'app-nav'
      }
    ]);

    console.log("launch on App");
  },

  onUpdated: function() {
    Ext.Msg.confirm(
      "Application Update",
      "This application has just successfully been updated to the latest version. Reload now?",
      function(buttonId) {
        if (buttonId === 'yes') {
          window.location.reload();
        }
      }
      );
  },


  // TODO: make browser nav go through active items versus adding new items


  // Application constants
  baseUrl: Ext.namespace().location.protocol+'//'+Ext.namespace().location.host,
  minDist: 20

});

// ---------- Application Utilities ------------ //

Ext.define("Events.Util", {
  singleton: true,
  config: {
    today: null,
    dateYmd: null,
    tomorrow: null,
    week: null,
    sevenDays: null,
    screenTitle: null,
    navBar: null,
    backBtn: null
  },

  addView: function(view) {
    var v;
    if (view.id) {
      v = Ext.Viewport.getComponent(view.id);
    }

    if (!v) {
      v = Ext.Viewport.add(view);
      console.log('new view added', v);
    }

    // init screenTitle (if not defined yet) and set it from view
    if (!this.screenTitle) {
      this.screenTitle = Ext.Viewport.getDockedComponent('screen-title');
    }
    if (v.getTitle && v.getTitle().length) {
      this.screenTitle.setTitle(v.getTitle());
    }

    // Set the view as active (if it's not already)
    if (Ext.Viewport.getActiveItem() != v) {
      // Finally show our view
      
      // TODO: detect if this is a forward, back or new view and change direction accordingly
      
      Ext.Viewport.animateActiveItem(v, {type: 'slide', direction: 'left'});
    }

    var u = this;
    setTimeout(function() {
      // init backBtn if not set yet
      if (!u.backBtn) {
        u.backBtn = u.screenTitle.getComponent('nav-back');
      }
      // show/hide back button based on History object
      var firstAction = (Events.app.getHistory().getActions()[0].getUrl() == Events.app.getHistory().getToken());
      u.backBtn.setHidden(firstAction);
    }, 300);
  },

  setActiveTab: function(t) {
    if (!this.navBar) {
      this.navBar = Ext.Viewport.getDockedComponent('app-nav');
    }
    if (t && t.length) {
      this.navBar.setActiveTab('nav-'+t);
      this.navBar.getActiveTab().setActive(true); // just to be sure it's marked properly
    } else {
      var at = this.navBar.getActiveTab();
      if (at) { at.setActive(false); }
    }
  },


  // ASYNC HANDLING
  loadError: function(op, hash) {
    if (op.error && op.error.status) {
      if (op.error.status > 499) {
        Events.app.getController('Error').showServerError();
      } else if (op.error.status == 404) {
        Events.app.getController('Error').showNotFound(hash);
      } else if (op.error.status > 399) {
        Events.app.getController('Error').showOtherError(op.error.statusText+' ('+op.error.status+')');
      }
    } else {
      Events.app.getController('Error').showServerError();
    }
  },


  // DATE FUNCTIONS
  getDateTimeRange: function(start, end) {
    if (!start) { return ""; }
    
    var md = Events.Util.isMultiDay(start, end);
    var st = Events.Util.hasTime(start);
    var et = Events.Util.hasTime(end);

    var r = Events.Util.getFuzzyDay(start);
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
      r += " to "+Events.Util.getFuzzyDay(end);
      if (Events.Util.hasTime(end)) {
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


  // TEXT HANDLING
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
