Ext.define('Events.view.EventMap', {
  extend: 'Ext.Map',
  alias: 'widget.eventmap',

  config: {
    loadingText: "Mapping events...",
    store: null,
    listeners: {
      maprender: function() { this.onMapRender(); }
    }
  },

  onMapRender: function() {
    if (this.getStore()) {
      var v = this;
      var m = this.getMap();

      var bounds = new google.maps.LatLngBounds();
      this.getStore().each(function(e) {
        var info = v.addMapMarker(e, m);
        bounds.extend(info.LatLng);
      });
      m.fitBounds(bounds);
      m.setCenter(bounds.getCenter());

      // Events to add and remove markers when records changed
      this.getStore().on('addrecords', function(s, recs) {
        Ext.each(recs, function() {
          v.addMapMarker(this, m);
        });
      });

      this.getStore().on('removerecords', function(s, recs) {
        Ext.each(recs, function() {
          if (this.gmapMarker) {
            this.gmapMarker.setMap(null);
            this.gmapMarker = null;
          }
        });
      });
      
    }
  },

  addMapMarker: function(e, m) {
    var p = new google.maps.LatLng(e.get('lat'), e.get('lng'));

    var marker = new google.maps.Marker({
      position: p,
      map: m,
      icon: 'resources/images/blue-dot.png',
      draggable: false,
      animation: google.maps.Animation.DROP,
      title: e.get('title')
    });
    e.gmapMarker = marker;

    google.maps.event.addListener(marker, 'click', function() {
      Events.app.redirectTo('view/'+e.get('id'));
    });

    return {'Marker': marker, 'LatLng': p};
  }
  
});