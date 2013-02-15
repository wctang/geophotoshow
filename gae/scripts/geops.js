(function() {

var undefined;

function FlickrPhoto(p) {
	this.id = p.id;
	this.sec = p.secret;
	this.t = p.title;
	this.lat = parseFloat(p.latitude);
	this.lng = parseFloat(p.longitude);
	this.acc = parseInt(p.accuracy,10);
	this.du = parseInt(p.dateupload,10);
	this.dt = p.datetaken;
	this.oi = p.owner;
	this.on = p.ownername;
	this.h = parseInt(p.o_height,10);
	this.w = parseInt(p.o_width,10);
	this.inf = p.iconfarm;
	this.ins = p.iconserver;
	this.med = p.media;
	this.url = 'http://farm'+p.farm+'.static.flickr.com/'+p.server+'/'+this.id+'_'+this.sec;
}
FlickrPhoto.prototype = {
	isVideo: function() { return this.med === 'video'; },
	hasGeo: function() { return this.acc !== 0; },
	getTitle: function() { return this.t; },
	getIconUrl: function() { return this.url+'_s.jpg'; }, //75x75
	getThumbUrl: function() { return this.url+'_t.jpg'; }, //max100
	getSmallUrl: function() { return this.url+'_m.jpg'; }, //max240
	getMediumUrl: function() { return this.url+'.jpg'; }, //max500
	getLargeUrl: function() { return this.url+'_b.jpg'; }, //max1024
	getFitUrl: function(w, h) {
		if ((w > 1024 && h > 1024) || (this.w >= this.h && w > 1024 && (w*this.h/this.w) < h) || (this.w < this.h && h > 1024 && (h*this.w/this.h) < w)) {
			return this.getLargeUrl();
		} else if ((w > 500 && h > 500) || (this.w >= this.h && w > 500 && (w*this.h/this.w) < h) || (this.w < this.h && h > 500 && (h*this.w/this.h) < w)) {
			return this.getMediumUrl();
		} else if ((w > 240 && h > 240) || (this.w >= this.h && w > 240 && (w*this.h/this.w) < h) || (this.w < this.h && h > 240 && (h*this.w/this.h) < w)) {
			return this.getSmallUrl();
		} else {
			return this.getThumbUrl();
		}
	},
	getVideoUrl: function() { return 'photo_secret='+this.sec+'&photo_id='+this.id+'&flickr_show_info_box=true'; },
	getPageUrl: function() { return 'http://www.flickr.com/photo.gne?id='+this.id; },
	getOwnerName: function() { return this.on; },
	getOwnerUrl: function() { return 'http://www.flickr.com/photos/'+this.oi+'/'; },
	getBuddyiconUrl: function() { return ( (this.ins == 0 && this.inf == 0) ? 'http://www.flickr.com/images/buddyicon.jpg' : 'http://farm'+this.inf+'.static.flickr.com/'+this.ins+'/buddyicons/'+this.oi+'.jpg' ); },
	getUploadDate: function() { return new Date(this.du*1000); },
	getUploadDateStr: function() { return this.getUploadDate().toLocaleDateString(); },
	getUploadDateUrl: function() {
		var d = this.getUploadDate();
		return 'http://www.flickr.com/photos/'+this.oi+'/archives/date-posted/'+d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate()+'/';
	},
	getTakenDate: function() {
		if (!this.dt || !/^(\d+)\-(\d+)\-(\d+) (\d+)\:(\d+)\:(\d+)$/.exec(this.dt))
			return this.getUploadDate();
		return new Date(RegExp.$1,RegExp.$2-1,RegExp.$3,RegExp.$4,RegExp.$5,RegExp.$6);
	},
	getTakenDateStr: function() { return this.getTakenDate().toLocaleDateString(); },
	getTakenDateUrl: function() {
		var d = this.getTakenDate();
		return 'http://www.flickr.com/photos/'+this.oi+'/archives/date-taken/'+d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate()+'/';
	}
};


var flickr = {
	extras: 'geo,date_upload,date_taken,owner_name,icon_server,o_dims,media',
	_api_key: 'bde30c9a6b136fee3e6f7b9b6fa0117c',

  //// GM Script
  //_callApi: function(methodname, opts, obj) {
  //    if(typeof(obj) === 'function') {
  //      var tmp={};
  //      tmp[methodname.replace(/\./g,'_')+'_onLoad']=obj;
  //      obj=tmp;
  //    }
  //    unsafewin.F.API.callMethod(methodname, opts, obj);
  //}.
	_callcount: 0,

	_callApi: function(methodname, opts, cb, issig) {
		var head = document.getElementsByTagName("head")[0];
		var script = document.createElement('script');
		script.type = 'text/javascript';

		var cb_id = 'flickrcb'+(+new Date)+(flickr._callcount++);
		opts.method = methodname;
		opts.format = 'json';
		opts.jsoncallback = cb_id;

		window[cb_id] = function(rsp) {
			if (!rsp || rsp.stat !== 'ok') {
				cb(null, opts, flickr);
				rsp.message = rsp.message || 'Unknown error!';
				ui_ctl.on_error(rsp.message);
			} else {
				rsp.photos = rsp.photos || rsp.photoset; // set photoset to photos
				cb(rsp, opts, flickr);
			}
			window[cb_id] = undefined;
			try { delete window[cb_id]; } catch (e) {}
			if (head) {
				head.removeChild(script);
			}
		};

		var req = [];
		if (issig) {
			$.each(opts, function(k,v) {
				if (k.charAt(0)==='_' || !opts.hasOwnProperty(k)) return;
				req.push('"'+k+'":"'+v+'"');
			});

			$.ajax( {type:'POST', url:'signcall', data:'{'+req.join(',')+'}', success:function(signedurl) {
				if (!/^http\:\/\//.exec(signedurl)) {
					document.location.reload();
					return;
				}

				script.src = signedurl;
				if (head) {
					head.appendChild(script);
				}
			}});
		} else {
			opts.api_key = flickr._api_key;
			//$.ajax({dataType:'jsonp', jsonp:'jsoncallback', url:'http://flickr.com/services/rest', data:opts, success:callback});
			$.each(opts, function(k,v) {
				if (k.charAt(0)==='_' || !opts.hasOwnProperty(k)) return;
				req.push(encodeURIComponent(k)+'='+encodeURIComponent(v));
			});

			script.src = 'http://flickr.com/services/rest?'+req.join('&');
			if (head) {
				head.appendChild(script);
			}
		}
	},

	getPage: function(rsp) { return parseInt(rsp.photos.page,10); },
	getPages: function(rsp) { return parseInt(rsp.photos.pages,10); },
	parsePhotos: function(photos, rsp, have_geo) {
		$.each(rsp.photos.photo, function(i,p) {
			var acc = parseInt(p.accuracy,10);
			if (have_geo && !acc) return;

			photos.push(new FlickrPhoto(p));
		});
	},
	getPlaceUrl: function(placeid) { return 'http://www.flickr.com/places/'+placeid; },

	// API
	groups: {
		pools: {
		getPhotos: function(opts, cb, issig) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.groups.pools.getPhotos', opts, cb, issig);
		}
		}
	},
	panda: {
		getPhotos: function(opts, cb) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.panda.getPhotos', opts, cb);
		}
	},
	people: {
		getInfo: function(opts, cb) {
			return flickr._callApi('flickr.people.getInfo', opts, cb);
		},
		getPublicGroups: function(opts, cb) {
			return flickr._callApi('flickr.people.getPublicGroups', opts, cb);
		}
	},
	contacts: {
		getList: function(opts, cb) {
			return flickr._callApi('flickr.contacts.getList', opts, cb, true);
		}
	},
	photos: {
		geo: {
		setLocation: function(opts, cb) {
			return flickr._callApi('flickr.photos.geo.setLocation', opts, cb, true);
		},
		removeLocation: function(opts, cb) {
			return flickr._callApi('flickr.photos.geo.removeLocation', opts, cb, true);
		}
		},
		getInfo: function(opts, cb) {
			return flickr._callApi('flickr.photos.getInfo', opts, cb);
		},
		getNotInSet: function(opts, cb) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photos.getNotInSet', opts, cb, true);
		},
		getUntagged: function(opts, cb) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photos.getUntagged', opts, cb, true);
		},
		getWithGeoData: function(opts, cb) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photos.getWithGeoData', opts, cb, true);
		},
		getWithoutGeoData: function(opts, cb) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photos.getWithoutGeoData', opts, cb, true);
		},
		recentlyUpdated: function(opts, cb) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photos.recentlyUpdated', opts, cb, true);
		},
		search: function(opts, cb, issig) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photos.search', opts, cb, issig);
		}
	},
	photosets: {
		getInfo: function(opts, cb) {
			return flickr._callApi('flickr.photosets.getInfo', opts, cb);
		},
		getList: function(opts, cb) {
			return flickr._callApi('flickr.photosets.getList', opts, cb);
		},
		getPhotos: function(opts, cb, issig) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photosets.getPhotos', opts, cb, issig);
		}
	},
	places: {
		findByLatLon: function(opts, cb) {
			return flickr._callApi('flickr.places.findByLatLon', opts, cb);
		},
		getInfo: function(opts, cb) {
			return flickr._callApi('flickr.places.getInfo', opts, cb);
		},
		resolvePlaceId: function(opts, cb) {
			return flickr._callApi('flickr.places.resolvePlaceId', opts, cb);
		},
		resolvePlaceURL: function(opts, cb) {
			return flickr._callApi('flickr.places.resolvePlaceURL', opts, cb);
		},
		tagsForPlace: function(opts, cb) {
			return flickr._callApi('flickr.places.tagsForPlace', opts, cb);
		}
	},
	tags: {
		getListUserPopular: function(opts, cb) {
			return flickr._callApi('flickr.tags.getListUserPopular', opts, cb);
		}
	}
};


var m = google.maps;

var flickr_show_mod = {
  $ctl: null,

  _update_ts: 0,
  _update_wait: false,
  _center: null,

  page: 1,
  perpage: '25',
  viewas: 'icons',
  sortby: 'interestingness',

  _markers: [],

  create: function() {
    this.$ctl = $('<div/>', {
      id: 'header',
      css: {
        margin: '5px',
        padding: '0px 10px',
        backgroundColor: 'white',
        textAlign: 'center'
      },
      text: "test"
    });
    gmap.controls[m.ControlPosition.RIGHT_TOP].push(this.$ctl.get(0));
  },
  init: function() {
  },
  on_idle: function() {
    console.log("flickr_show_mod.on_idle");
    ui_ctl.save_pos();

    this.refreshPhotoGroup({page:1, updatepos:true, delay:true});
  },

  clearGroupMarker: function() {
    $.each(this._markers, function(i,ov) { ov.setMap(null); });
    this._markers = [];
  },

  onGroupMarkerClick: function() {
    console.log(this);
    /*
    $.each(browse_mod._markers, function(i,m) {
      m.setImage(m.getIcon().image);
    });
    this.setImage(this.getIcon().image.replace('.png', 's.png'));

    browse_mod.curr_photo_list = this.photos;
    browse_mod.fillPhotoList();
    ui_ctl.expendPanel();
    */
  },

  refreshPhotoGroup: function(opt) {
    var that = this;
    var ts = (+new Date);

    if (opt.delay)
      that._update_ts = ts + 1500;

    if (ts < that._update_ts) {
      if (that._update_wait)
        return;

      that._update_wait = true;
      opt.delay = false;
      setTimeout( function() { that._update_wait = false; that.refreshPhotoGroup(opt); }, 500);
      return;
    }

    //mod_ctl.showmode.hide();


    if (opt.page)
      this.page = opt.page;

    var pos = gmap.getCenter();
    this._center = pos;

    var acc = gmap.getZoom() - 3; // include larger accuracy
    if (acc < 1) acc = 1;
    if (acc > 16) acc = 16;

      /*
		if (actopt.updatepos) {
			$('#plac').empty();
			this.$tgl.empty();

			flickr.places.findByLatLon({lat:pos.lat(), lon:pos.lng(), accuracy:acc}, function(rsp, params, api) {
				if (!rsp || !rsp.places || !rsp.places.place || rsp.places.place.length == 0) return;
				$('<a target="_blank" href="http://www.flickr.com/places'+rsp.places.place[0].place_url+'">'+rsp.places.place[0].name+'</a>').appendTo('#plac');

				flickr.places.tagsForPlace({place_id:rsp.places.place[0].place_id}, function(rsp, params, api) {
					if (!rsp || !rsp.tags || !rsp.tags.tag) return;

					var ccc = '<div>';
					$.each(rsp.tags.tag, function(k, v) {
						ccc += '<span class="tag">'+v._content+'</span> ';
					});
					ccc += '</div>';
					$('#browse_taglist').append(ccc);
				});
			});
		}
        */


    //var bbox = common_ctl.getRefreshRange(parseInt(this.$range_lt.css('left'),10), parseInt(this.$range_lt.css('top'),10), parseInt(this.$range_rb.css('left'),10), parseInt(this.$range_rb.css('top'),10));
    var nw = mod_ctl.fromPointToLatLng(100, 100);
    var se = mod_ctl.fromPointToLatLng(800, 400);
    var w = nw.lng();
    var e = se.lng();
    var n = nw.lat();
    var s = se.lat();
    if (w > 180) w-=360;
    if (e <= -180) e+=360;
    if (e < w) {
        if ((180+e) > (180-w)) { w=-180;
        } else { e=180; }
    }

    var bbox = w+','+s+','+e+','+n;
    var opts = {min_taken_date:'1800-01-01', bbox:bbox, accuracy:acc, page:this.page, update_ts:this._update_ts};
/*

		var query = $.trim($('#browse_query').children(':text').val());
		if (query !== '') {
			opts.text = query;
		}

		var $tag_curr = $('#browse_taglist').find('.tag_curr');
		if ($tag_curr.size() > 0) {
			opts.tags = $tag_curr.text();
		}
*/

    opts.per_page = this.perpage;

    if (this.sortby === 'posted') {
      opts.sort = 'date-posted-desc';
    } else if (this.sortby === 'interestingness') {
      opts.sort = 'interestingness-desc';
    }
/*
		var browse_type = $('#browse_type').val();
		if (browse_type === 'user' && user) {
			opts.user_id = user.nsid;
		} else if (browse_type === 'video') {
			opts.media = 'videos';
		} else if (/^\d+@N\d+$/.exec(browse_type)) {
			opts.user_id = browse_type;
		}
*/

//		ui_ctl.beginLoading();
    flickr.photos.search(opts, this.refreshPhotoGroupCallback, /*!!user*/false);
  },
  refreshPhotoGroupCallback: function(rsp, params, api) {
    var that = flickr_show_mod;
    if (that._update_ts !== params.update_ts || mod_ctl.curr_mod !== that)
      return;

    try {
      if (!rsp) return;
/*
browse_mod.page = api.getPage(rsp);
browse_mod.pages = api.getPages(rsp);
common_ctl.makePager($('#browse_pager'), browse_mod.page, browse_mod.pages);
*/

      var photos = [];
      api.parsePhotos(photos,rsp,true);

      that.clearGroupMarker();

      $.each(mod_ctl.caculatePhotoGroups(photos), function(i,pg) {
        var marker = mod_ctl.createGroupMarker(pg);
        m.event.addListener(marker, 'click', that.onGroupMarkerClick);
        that._markers.push(marker);
        marker.setMap(gmap);
      });
/*
browse_mod.curr_photo_list = photos;
browse_mod.fillPhotoList();
*/
    } finally {
/*
browse_mod.$curmap_p.hide();
browse_mod.refreshLinks();
ui_ctl.endLoading();
*/
    }
  }
};

mod_ctl = {

  all_mods: {flickr_show:flickr_show_mod},
  mods: [],
  curr_mod: null,

  _overlay: null,
  $ctl: null,

  init: function(mods) {
    var that = this;

    this._overlay = new m.OverlayView();
    this._overlay.draw = function() {};
    this._overlay.setMap(gmap);

    this.$ctl = $('<div/>', {
      id: 'header',
      css: {
        margin: '5px',
        padding: '0px 10px',
        backgroundColor: 'white',
        textAlign: 'center'
      },
      text: "test"
    });
    gmap.controls[m.ControlPosition.TOP_CENTER].push(this.$ctl.get(0));

    $.each(mods, function(k,v) {
      var mod = that.all_mods[v];
      mod.create();
      that.mods.push(mod);
      if (that.curr_mod == null)
        that.curr_mod = mod;
    });

    //google.maps.event.addListener(gmap, "dragend", savePos);
    google.maps.event.addListener(gmap, 'idle', function() {
      var mod = that.curr_mod;
	  if (!mod || !mod.on_idle) return;
      return mod.on_idle();
    });
  },

  fromPointToLatLng: function(x, y) {
    var that = this;
    return that._overlay.getProjection().fromContainerPixelToLatLng(new m.Point(x, y));
  },

  deltas: [
    0,
    0,
    6.0471013966887784,
    3.0235506983443892,
    1.5117753491721946,
    0.7558876745860973,
    0.4381797339583715,
    0.2166893459120705,
    0.1054534198706207,
    0.0517575120441158,
    0.0256017451528869,
    0.012732042885645,
    0.00634837196261628,
    0.003169749786363714,
    0.001583755663266591,
    0.0007915970919446143,
    0.0003957279865313504,
    0.0001978462849822430,
    0.0000989186817588934,
    0.0000494593408794467,
    0.0000247296704397233],
  caculatePhotoGroups: function(photos) {
    var zoom = gmap.getZoom();
    var delta = this.deltas[zoom];

    var pgrps=[]
    $.each(photos, function(i,p) {
      if (!p.hasGeo()) return;

      var merged = false;
      for (var j=0,len2=pgrps.length; j<len2; ++j) {
        var b = pgrps[j];
        var bp = b.sq;
        if (bp[0]+90+delta>p.lat+90 && bp[1]+90-delta<p.lat+90 && bp[2]+180+delta>p.lng+180 && bp[3]+180-delta<p.lng+180) {
          if (bp[0]<p.lat) bp[0]=p.lat;
          if (bp[1]>p.lat) bp[1]=p.lat;
          if (bp[2]<p.lng) bp[2]=p.lng;
          if (bp[3]>p.lng) bp[3]=p.lng;
          merged = true;
          b.photos.push(p);
          break;
        }
      }
      if (!merged) {
        pgrps.push({sq:[p.lat,p.lat,p.lng,p.lng], photos:[p]});
      }
    });

    $.each(pgrps, function(i,pg) {
      pg.lat = (pg.sq[0]+pg.sq[1])/2;
      pg.lng = (pg.sq[2]+pg.sq[3])/2;
      if (pg.lng>180)
        pg.lng-=360;
      else if (pg.lng<=-180)
        pg.lng+=360;
    });
    return pgrps;
  },
  createGroupMarker: function(photo_group) {
    var siz;
    if (photo_group.photos.length < 5) {
      siz = 22;
    } else if (photo_group.photos.length < 20) {
      siz = 32;
    } else {
      siz = 42;
    }
    //var icon = new m.Icon(), siz;
    //icon.transparent= "/images/transparent.png";
    //icon.label = {url:photo_group.photos[0].getIconUrl()};
    //icon.label.anchor = new GPoint(4,4);
    //icon.image = "/images/mbg"+siz+"x"+siz+".png";
    //icon.iconSize = new GSize(siz, siz);
    //icon.iconAnchor = new GPoint(siz/2, siz/2);
    //icon.label.size = new GSize(siz-8,siz-8);
    var icon = {
      url: photo_group.photos[0].getIconUrl(),
      scaledSize: new m.Size(siz-8, siz-8),
      anchor: new m.Point((siz-8)/2, (siz-8)/2)
    };
    var shadow = {
      url:"/images/mbg"+siz+"x"+siz+".png",
      anchor: new m.Point(siz/2, siz/2)
    };

    //var maker = new m.Marker(new m.LatLng(photo_group.lat, photo_group.lng), {icon:icon});
    var maker = new m.Marker({position:new m.LatLng(photo_group.lat, photo_group.lng), icon:icon, shadow:shadow});
    maker.photos = photo_group.photos;
    return maker;
  }
};
})();

