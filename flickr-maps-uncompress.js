(function() {

//
// Global object: gmap, sett
//

//if (typeof loadFirebugConsole !== 'undefined') loadFirebugConsole();
//if (typeof console === 'undefined') {
//  var console = { log: function(){} };
//}

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
	_api_key: API_KEY,

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


//
// a show module plugin
// xxx = {
// init: function() {},
// showPhoto: function(p) {}
// }
// and set to mod_ctl.showmode
//
var showpanel_ctl = {
	streetviewClient: new GStreetviewClient(),
	$p:null, $bg:null, $ph:null, $phi:null, $vd:null, $vdf:null, $ifo:null, $sv:null, $svf:null, $loc:null,
	init: function() {
		var that = this;
		this.$p = $(
		'<div id="showpanel" style="position:absolute; top:0; bottom:0; left:0; right:0; z-index:1; display:none;">'+
			'<div id="showpanel_bg" style="position:absolute; left:0; right:0; top:0; bottom:0; background:black url(/images/loading2.gif) no-repeat center;"></div>'+
			'<div id="showpanel_photo" style="position:absolute; display:none;">'+
				'<img id="showpanel_photo_img" style="display:none;"/>'+
				'<div id="showpanel_info" style="position:absolute; left:0; right:0; bottom:10px; background:white; display:none;">'+
					'<div style="padding:5px">'+
						'<a class="title" target="_blank" style="font-size:1.5em; text-decoration:none;"></a>'+
					'</div>'+
					'<div style="margin-top:.5m;">'+
						'<a class="buddyurl" target="_blank"><img class="buddy" style="width:48px; height:48px; float:left; margin:0 5px 5px; background:transparent url(/images/loading.gif);"></img></a>'+
						'<span>From <a class="owner" target="_blank"></a></span><br/>'+
						'<span>Posted on <a class="uploaddate" target="_blank"></a>, Taken on <a class="takendate" target="_blank"></a></span><br/>'+
						'<span id="showpanel_location">Show <a class="location" href="javascript:void(0)">Street view</a></span>'+
					'</div>'+
				'</div>'+
				'<img class="close" src="/images/transparent.png" style="position:absolute; right:5px; top:5px; display:none;"/>'+
			'</div>'+
			'<div id="showpanel_video" style="position:absolute; top:0; bottom:0; left:0; right:0; display:none;">'+
				'<div id="showpanel_video_flash" style="position:absolute; left:0; right:0; top:0; bottom:0;"></div>'+
				'<img class="close" src="/images/transparent.png" style="position:absolute; right:5px; top:5px;"/>'+
			'</div>'+
			'<div id="showpanel_streetview" style="position:absolute; left:0; right:0; top:0; bottom:0; display:none;">'+
				'<div id="showpanel_streetview_flash" style="position:absolute; left:0; right:0; top:0; bottom:0;"></div>'+
				'<img class="close" src="/images/transparent.png" style="position:absolute; right:5px; top:5px;"/>'+
			'</div>'+
		'</div>');
		gmap.getContainer().appendChild(this.$p.get(0));
		this.$bg = this.$p.find('#showpanel_bg');
		this.$ph = this.$p.find('#showpanel_photo');
		this.$phi = this.$p.find('#showpanel_photo_img');
		this.$phc = this.$ph.find('.close');
		this.$ifo = this.$p.find('#showpanel_info');
		this.$loc = this.$p.find('#showpanel_location');
		this.$vd = this.$p.find('#showpanel_video');
		this.$vdf = this.$p.find('#showpanel_video_flash');
		this.$sv = this.$p.find('#showpanel_streetview');
		this.$svf = this.$p.find('#showpanel_streetview_flash');

		this.$bg.css('opacity', .8).click(function(e) {
			if ($(e.target).attr('id') === 'showpanel_bg') {
				that.hide();
			}
		});
		this.$phc.click(function() {
			that.hide();
		});
		this.$ph.hover(function() {
			that.$ifo.fadeIn('fast');
			that.$phc.fadeIn('fast');
		}, function() {
			that.$ifo.fadeOut('fast');
			that.$phc.fadeOut('fast');
		});
		this.$ifo.find('.location').click(function() {
			if (that.$sv.get(0).location) {
				that.$svf.empty();
				new GStreetviewPanorama(that.$svf.get(0), that.$sv.get(0).location);
				that.$sv.show();
			} else if (that.$sv.get(0).latlng) {
				//
			}
		});

		this.$vd.find('.close').click(function() {
			that.hide();
		});

		this.$sv.find('.close').click(function() {
			that.$sv.fadeOut('fast');
		});
	},
	showPhoto: function(p) {
		var that = this;
		var w = this.$p.width();
		var h = this.$p.height();

		this.$sv.hide();
		this.$sv.get(0).location = null;

		if (p.isVideo()) {
			this.$ph.fadeOut('fast');

			this.$vdf.empty().append(
				'<embed type="application/x-shockwave-flash" src="http://www.flickr.com/apps/video/stewart.swf?v=71377" bgcolor="#000000" allowfullscreen="true" flashvars="'+p.getVideoUrl()+'" wmode="opaque" style="position:relative; width:'+w+'px; height:'+h+'px;">'+
				'</embed>');
			this.$vd.show();
		} else {
			this.$vd.fadeOut('fast');
			this.$vdf.empty();

			this.$ph.fadeOut('fast');

			this.$ifo.find('.title').attr('href',p.getPageUrl()).text(p.getTitle()).end()
				.find('.buddyurl').attr('href',p.getOwnerUrl()).end()
				.find('.buddy').attr('src',p.getBuddyiconUrl()).end()
				.find('.owner').attr('href',p.getOwnerUrl()).text(p.getOwnerName()).end()
				.find('.uploaddate').attr('href',p.getUploadDateUrl()).text(p.getUploadDateStr()).end()
				.find('.takendate').attr('href',p.getTakenDateUrl()).text(p.getTakenDateStr());

			if (w > 500 || h > 500) {
				this.$phi.get(0).url = p.getMediumUrl();
			} else {
				this.$phi.get(0).url = p.getFitUrl(w, h);
			}
			$(new Image()).load(function() {
				if (this.src !== that.$phi.get(0).url) return;

				var ww = this.width, hh = this.height;
				if (ww > w) {
					hh = w*hh/ww;
					ww = w;
				} else if (hh > h) {
					ww = h*ww/hh;
					hh = h;
				}
				that.$phi.css({width:ww, height:hh}).attr('src',this.src).show();
				that.$ph.css({left:(w-ww)/2, top:(h-hh)/2, width:ww, height:hh}).stop(true, true).fadeIn('fast');
			}).attr('src', this.$phi.get(0).url);
		}

		this.$loc.hide();
		if (!p.hasGeo()) {
			this.$sv.get(0).latlng = null;
		} else {
			this.$sv.get(0).latlng = new GLatLng(p.lat,p.lng);

			if (p.acc >= 14) {
				this.streetviewClient.getNearestPanorama(this.$sv.get(0).latlng, function(response) {
					if (response.code != 200) return;

					that.$loc.show();
					that.$sv.get(0).location = response.location;
				});
			}
		}

		this.$p.fadeIn('fast');
		gmap.disableScrollWheelZoom();
	},
	hide: function() {
		this.$vdf.empty();
		this.$vd.hide();
		this.$svf.empty();
		this.$sv.hide();
		this.$ifo.hide();
		this.$phi.hide();
		this.$phc.hide();
		this.$ph.fadeOut('fast');
		this.$p.fadeOut('fast');
		gmap.enableScrollWheelZoom();
	}
};

var common_ctl = {
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

	getRefreshRange: function(left, top, right, bottom) {
		var nw = gmap.fromContainerPixelToLatLng(new GPoint(left+10, top+10));
		var se = gmap.fromContainerPixelToLatLng(new GPoint(right-10, bottom-10));
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

		return w+','+s+','+e+','+n;
	},
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
		var icon = new GIcon(), siz;
		icon.transparent= "/images/transparent.png";
		icon.label = {url:photo_group.photos[0].getIconUrl()};
		icon.label.anchor = new GPoint(4,4);
		if (photo_group.photos.length < 5) {
			siz = 22;
		} else if (photo_group.photos.length < 20) {
			siz = 32;
		} else {
			siz = 42;
		}
		icon.image = "/images/mbg"+siz+"x"+siz+".png";
		icon.iconSize = new GSize(siz, siz);
		icon.iconAnchor = new GPoint(siz/2, siz/2);
		icon.label.size = new GSize(siz-8,siz-8);

		var maker = new GMarker(new GLatLng(photo_group.lat, photo_group.lng), {icon:icon});
		maker.photos = photo_group.photos;
		return maker;
	},
	createIconMarker: function(photo) {
		var icon = new GIcon();
		icon.image = '/images/marker_image.png';
		icon.shadow = '/images/marker_shadow.png';
		icon.iconSize = new GSize(79, 89);
		icon.shadowSize = new GSize(109, 89);
		icon.iconAnchor = new GPoint(40, 89);
		icon.infoWindowAnchor = new GPoint(79, 50);
		icon.imageMap=[0,0,78,0,78,78,49,78,39,88,39,78,0,78];
		icon.transparent='/images/marker_transparent.png';
		icon.label = {url:photo.getIconUrl(), anchor:new GLatLng(2,2), size:new GSize(75,75)};
		return new GMarker(new GLatLng(photo.lat, photo.lng), {icon:icon});
	},
	makePager: function($p, page, pages) {
		$p.empty();
		if ( pages <= 0) return;

		var s = [0, 1, 2, page-2, page-1, page, page+1, page+2];
		if (page < 6) {
			s.push(2); s.push(3); s.push(4); s.push(5); s.push(6);
		}
		s.sort(function(a,b) { return a-b; });

		$p.append('<span class="pager_prev">prev</span>');
		for (var i=1; i<s.length; ++i) {
			if (s[i] < 1 || s[i] > pages || s[i] === s[i-1]) continue;

			if (s[i] !== s[i-1]+1) {
				$p.append('<span class="pager_dots">...</span>');
			}
			if (s[i] === page) {
				$p.append('<span class="pager_curr">'+s[i]+'</span>');
			} else {
				$p.append('<span class="pager_num">'+s[i]+'</span>');
			}
		}
		if (s[s.length-1] < pages) {
			$p.append('<span class="pager_dots">...'+pages+'</span>');
		}
		$p.append('<span class="pager_next">next</span>');
	},
	formatPhotoList: function( photos, show_type, has_owner, have_geo, have_checkbox, selected) {
		var $d = $('<div class="panel"></div>');

		$.each(photos, function(i, p) {
			var ps = '';
			var s = '';

			if (have_checkbox) {
				if ( $.inArray(p.id, selected) >= 0) {
					ps += '<input class="geotag_sel" type="checkbox" checked="true"></input>'
				} else {
					ps += '<input class="geotag_sel" type="checkbox"></input>'
				}
			}

			if (have_geo && p.hasGeo()) {
				ps += '<div class="havpos"><img class="pos" src="/images/transparent.png"/></div>';
			}

			if (show_type === 'detail') { // detail
				s += '<div class="item_detail">';
				s += ps;
				s += '<div class="thumb"><a target="_blank" href="'+p.getPageUrl()+'"><img class="f_thumb" src="'+p.getThumbUrl()+'" title="'+p.getTitle()+'"/>';
				if (p.isVideo()) {
					s += '<img src="/images/video.png" style="position:absolute; left:3px; top:3px;"></img>';
				}
				s += '</a></div>';
				s += '<div class="desc">';
				s += '<span class="title">'+p.getTitle()+'</span><br/>';
				if (has_owner) {
					s += '<a href="'+p.getOwnerUrl()+'" target="_blank"><img class="buddy" src="'+p.getBuddyiconUrl()+'"></img></a>'
					s += '<span class="owner">From <a href="'+p.getOwnerUrl()+'" target="_blank">'+p.getOwnerName()+'</a></span><br/>';
				}
				//s += '<span>Posted on <a href="'+p.getUploadDateUrl()+'" target="_blank">'+p.getUploadDateStr()+'</a><br/>Taken on <a href="'+p.getTakenDateUrl()+'" target="_blank">'+p.getTakenDateStr()+'</a></span>';
				s += '<span>Posted on <a href="'+p.getUploadDateUrl()+'" target="_blank">'+p.getUploadDateStr()+'</a></span>';
				s += '</div><div style="clear:both;"></div>';
				s += '</div>';
			} else if (show_type === 'thumb') { // thumb
				s += '<div class="item_thumb">';
				s += ps;
				s += '<div class="thumb"><a target="_blank" href="'+p.getPageUrl()+'"><img class="f_thumb" src="'+p.getThumbUrl()+'" title="'+p.getTitle()+'"/>';
				if (p.isVideo()) {
					s += '<img src="/images/video.png" style="position:absolute; left:3px; top:3px;"></img>';
				}
				s += '</a></div>';
				s += '</div>';
			} else { // icon
				s += '<div class="item_icon">';
				s += ps;
				s += '<div class="icon"><a target="_blank" href="'+p.getPageUrl()+'"><img class="f_icon" src="'+p.getIconUrl()+'" title="'+p.getTitle()+'"/>';
				if (p.isVideo()) {
					s += '<img src="/images/video.png" style="position:absolute; left:3px; top:3px;"></img>';
				}
				s += '</a></div>';
				s += '</div>';
			}

			$(s).appendTo($d).get(0).photo = p;
		});
		return $d.get(0);
	},

	parseGPX: function(gpx, ctnr) {
		var bound = new GLatLngBounds();

    //for(var i_wpt=0,n_wpt=gpx.wpt.length; i_wpt<n_wpt; ++i_wpt) {
    //  var wpt = gpx.wpt[i_wpt];
    //  var pt = new GLatLng(parseFloat(wpt.lat), parseFloat(wpt.lon));
    //  bound.extend(pt);
    //  geotag_ctl.curr_gpx.push(new GMarker(pt));
    //}

		$.each(gpx.rte, function(i,rte) {
			var color = null;
			//if (trk.color) { color = '#'+trk.color; }

			var polyllinept = [];
			$.each(rte.rtept, function(i,rtept) {
				var pt = new GLatLng(parseFloat(rtept.lat), parseFloat(rtept.lon));
				polyllinept.push(pt);
				bound.extend(pt);
			});
			polyllinept.push(polyllinept[0]);
			ctnr.push(new GPolyline(polyllinept, color, 3));
		});

		$.each(gpx.trk, function(i,trk) {
			var color = null;
			//if (trk.color) { color = '#'+trk.color; }

			$.each(trk.trkseg, function(i,trkseg) {
				var polyllinept = [];
				$.each(trkseg.trkpt, function(i,trkpt) {
					var pt = new GLatLng(parseFloat(trkpt.lat), parseFloat(trkpt.lon));
					polyllinept.push(pt);
					bound.extend(pt);
				});
				ctnr.push(new GPolyline(polyllinept, color, 3));
			});
		});

		return bound;
	}
};


//
//var module_ctl = {
//	create: function() {},
//	init: function() {},
//	onActive: function() {},
//	onDeActive: function() {}
//};
//
var browse_mod = {
	page: 1,
	pages: 0,
	curr_photo_list: null,
	refresh_control: null,
	_markers: [],
	_timestamp: null,
	_center: null,
	$p:null, $sw:null, $tgl:null, $focus:null, $range_lt:null, $range_rb:null, $myloc:null, $curmap:null, $curmap_p:null,
	refresh: 'auto', perpage: '25', viewas: 'icons', sortby: 'interestingness',

	create: function() {
		var that = this;
		this.$sw = $('<a id="browse_switch" href="javascript:void(0)">Browse</a>');
		this.$sw.appendTo('#switch');

		var ss =
		'<div id="browse_tab" class="tab">'+
			'<div class="tabrow" style="height:2em;">'+
				'<select id="browse_type">'+
					'<option value="all" title="Search all photos.">All Photos</option>'+
					'<option value="video" title="Search all videos.">Only Video</option>';
		if (user) {
			ss +=		'<option value="user" title="Only Search your photos.">Your Photos</option>'+
					'<optgroup label="Your contacts" id="contact_optgroup"></optgroup>';
		}
			ss +=	'</select>'+
			'</div>'+
			'<div class="tabrow" style="height:2em;">'+
				'<form id="browse_query" style="margin:0; padding:0;">'+
					'<input type="text" style="width:350px;"/>'+
					'<input type="submit" value="Search"/>'+
				'</form>'+
			'</div>'+
			'<div class="tabrow" style="height:10em;">'+
				'<div><span id="plac"></span><span class="taglist_clear" style="float:right;">Clear</span></div>'+
				'<div id="browse_taglist" class="taglist" style="height:7.5em;"></div>'+
			'</div>'+
			'<div class="tabrow" style="height:2em;">'+
				'<span id="browse_perpage" style="float:right;">'+
					'<span id="browse_perpage_25" class="perpage_num">25</span>'+
					'<span id="browse_perpage_50" class="perpage_num">50</span>'+
					'<span id="browse_perpage_100" class="perpage_num">100</span>'+
					'<span id="browse_perpage_200" class="perpage_num">200</span>'+
				'</span>'+
				'<span id="browse_pager"></span>'+
			'</div>'+
			'<div class="tabrow" style="height:2em;">'+
				'<span id="browse_viewas" style="float:right;">'+
					'<span id="browse_viewas_icons" class="viewas_type" type="icons">Icons</span>'+
					'<span id="browse_viewas_thumb" class="viewas_type" type="thumb">Thumbnail</span>'+
					'<span id="browse_viewas_detail" class="viewas_type" type="detail">Detail</span>'+
				'</span>'+
				'<span id="browse_sortby">'+
					'<span id="browse_sortby_posted" class="sortby_type" type="posted">Date</span>'+
					'<span id="browse_sortby_interestingness" class="sortby_type" type="interestingness">Rank</span>'+
				'</span>'+
			'</div>'+
			'<div id="browse_photolist" class="photolist" style="top:18.5em;"></div>'+
		'</div>';
		this.$p = $(ss);
		this.$tgl = this.$p.find('#browse_taglist');
		this.$p.appendTo('#tabs');


		var RefreshControl = function() {
			this.$div = $(
			'<div style="text-align:center; font-size:11pt; display:none;">'+
				'<img class="refresh" src="/images/transparent.png"/>'+
				'<div id="sel_auto" class="selected">Auto</div>'+
				'<div id="sel_manual" class="selable">Manual</div>'+
			'</div>');
		}
		RefreshControl.prototype = new GControl();
		RefreshControl.prototype.initialize = function(map) {
			var that = this;
			this.$div.click(function(e) {
				var clickon = e.target.tagName+':'+e.target.className;

				if (clickon === 'IMG:refresh') {
					browse_mod.refreshPhotoGroup({page:1, updatepos:true});
				} else if (clickon === 'DIV:selable') {
					that.$div.find('.selected').attr('class', 'selable');
					browse_mod.refresh = $(e.target).attr('class', 'selected').attr('id').replace('sel_', '');
					mod_ctl.save_setting();
				}
			});

			map.getContainer().appendChild(this.$div.get(0));
			return this.$div.get(0);
		};
		RefreshControl.prototype.getDefaultPosition = function() {
			return new GControlPosition(G_ANCHOR_TOP_RIGHT, new GSize(20, 50));
		};
		RefreshControl.prototype.printable = function() { return false; };
		RefreshControl.prototype.selectable = function() { return false; };
		RefreshControl.prototype.setMode = function(mod) {
			if (mod === 'auto') {
				this.$div.find('#sel_auto').attr('class', 'selected');
				this.$div.find('#sel_manual').attr('class', 'selable');
			} else {
				this.$div.find('#sel_auto').attr('class', 'selable');
				this.$div.find('#sel_manual').attr('class', 'selected');
			}
		};
		RefreshControl.prototype.hide = function(mod) {
			this.$div.hide();
		};
		RefreshControl.prototype.show = function(mod) {
			this.$div.show();
		};

		this.refresh_control = new RefreshControl();
		gmap.addControl(this.refresh_control);

		if (navigator.geolocation || (google.loader && google.loader.ClientLocation)) {
			this.$myloc = $('<a id="links_findmylocation" href="javascript:void(0)" style="display:none;">Find my location</a>');
			this.$myloc.appendTo('#links');
			this.$myloc.click(function() { try {
				function jumpto(lat, lng, acc) {
					if (!acc) acc = 10;
					gmap.setCenter(new GLatLng(lat, lng), acc);
				}
				if (navigator.geolocation) {
					var that = this;
					if (that.loc) {
						jumpto(that.loc[0], that.loc[1], that.loc[2]);
					} else {
						navigator.geolocation.getCurrentPosition(function (position) {
							that.loc = [parseFloat(position.coords.latitude), parseFloat(position.coords.longitude), 8];
							// TODO should check position.coords.accuracy
							jumpto(that.loc[0], that.loc[1], that.loc[2]);
						});
					}
				} else if (google.loader && google.loader.ClientLocation) {
					jumpto(parseFloat(google.loader.ClientLocation.latitude), parseFloat(google.loader.ClientLocation.longitude), 8);
				}
			} finally { return false; }});
		}

		this.$curmap_p = $('<div id="links_currentmap_panel" class="popup_panel" style="position:absolute; top:27px; right:10px; z-index:7; padding:5px 5px 10px 10px; display:none;">'+
			'<img class="close" src="/images/transparent.png" style="float:right;"/>'+
			'<div>Copy and paste the URL below:<br/>'+
			'<input type="text" tabindex="400" style="width:29em;"/></div>'+
		'</div>');
		this.$curmap_p.appendTo('#mainbar');
		this.$curmap_p.find('.close').click(function(){ that.$curmap_p.hide(); });
		this.$curmap_p.find('input').click(function(){ this.select(); });

		this.$curmap = $('<a id="links_currentmap" target="_blank" style="display:none;"><img class="link" src="/images/transparent.png"/>Link to this map</a>');
		this.$curmap.appendTo('#links');
		this.$curmap.click(function() { try {
			that.$curmap_p.find('input').val(this.href);
			that.$curmap_p.show();
		} finally { return false; }});

		$('#browse_type').change( function() { try { that.refreshPhotoGroup({page:1}); } finally { return false; }});
		$('#browse_query').submit(function() { try { that.refreshPhotoGroup({page:1}); } finally { return false; }});

		this.$p.click(function(e) {
			var clickon = e.target.tagName+':'+e.target.className;

			switch (clickon) {
			case 'SPAN:pager_prev': {
				if (that.page - 1 > 0) {
					that.refreshPhotoGroup({page:that.page-1});
				}
				break;
			}
			case 'SPAN:pager_num': {
				var page = parseInt($(e.target).text(),10);
				if (page === that.page) break;
				that.refreshPhotoGroup({page:page});
				break;
			}
			case 'SPAN:pager_next': {
				if (that.page + 1 <= that.pages) {
					that.refreshPhotoGroup({page:that.page+1});
				}
				break;
			}
			case 'SPAN:perpage_num': {
				$('#browse_perpage').find('span').attr('class', 'perpage_num');
				that.perpage = $(e.target).attr('class', 'perpage_curr').attr('id').replace(/browse_perpage_/, '');
				mod_ctl.save_setting();
				that.refreshPhotoGroup({page:1});
				break;
			}
			case 'SPAN:sortby_type': {
				$('#browse_sortby').find('span').attr('class', 'sortby_type');
				that.sortby = $(e.target).attr('class', 'sortby_curr').attr('type');
				mod_ctl.save_setting();
				that.refreshPhotoGroup({page:1});
				break;
			}
			case 'SPAN:viewas_type': {
				$('#browse_viewas').find('span').attr('class', 'viewas_type');
				that.viewas = $(e.target).attr('class', 'viewas_curr').attr('type');
				mod_ctl.save_setting();
				if (!that.curr_photo_list) return;
				that.fillPhotoList();
				break;
			}
			case 'SPAN:tag': {
				that.$tgl.find('span').attr('class', 'tag');
				$(e.target).attr('class', 'tag_curr');
				that.refreshPhotoGroup({page:1});
				that.refreshLinks();
				break;
			}
			case 'SPAN:taglist_clear': {
				that.$tgl.find('span').attr('class', 'tag');
				that.refreshPhotoGroup({page:1});
				that.refreshLinks();
				break;
			}
			case 'IMG:f_icon':
			case 'IMG:f_thumb':
			case 'DIV:imgtitle': {
				var p = e.target.parentNode.parentNode.parentNode.photo;
				if (!p) return;

				mod_ctl.showmode.showPhoto(p);
				return false;
			}
			}
		});

		this.$focus = $('<div id="browse_focus" class="range"><div class="vline" style="top:0px; left:20px; height:41px;"></div><div class="hline" style="top:20px; left:0px; width:41px;"></div></div>');
		this.$range_lt = $('<div id="browse_range_lt" class="range"><div class="vline" style="top:0px; left:0px; height:100px;"></div><div class="hline" style="top:0px; left:0px; width:100px;"></div></div>');
		this.$range_rb = $('<div id="browse_range_rb" class="range"><div class="vline" style="bottom:0px; right:0px; height:100px;"></div><div class="hline" style="bottom:0px; right:0px; width:100px;"></div></div>');

		gmap.getContainer().appendChild(this.$focus.get(0));
		gmap.getContainer().appendChild(this.$range_lt.get(0));
		gmap.getContainer().appendChild(this.$range_rb.get(0));
		this.onResize();
	},
	load_setting: function(setting) {
		if (setting.browse_perpage) this.perpage = setting.browse_perpage;
		if (setting.browse_viewas) this.viewas = setting.browse_viewas;
		if (setting.browse_sortby) this.sortby = setting.browse_sortby;
		if (setting.browse_refresh) this.refresh = setting.browse_refresh;
		$('#browse_perpage').find('span').attr('class', 'perpage_num');
		$('#browse_perpage_'+this.perpage).attr('class', 'perpage_curr');
		$('#browse_viewas').find('span').attr('class', 'viewas_type');
		$('#browse_viewas_'+this.viewas).attr('class', 'viewas_curr');
		$('#browse_sortby').find('span').attr('class', 'sortby_type');
		$('#browse_sortby_'+this.sortby).attr('class', 'sortby_curr');
		this.refresh_control.setMode(this.refresh);
	},
	save_setting: function(setting) {
		setting.browse_perpage = this.perpage;
		setting.browse_viewas = this.viewas;
		setting.browse_sortby = this.sortby;
		setting.browse_refresh = this.refresh;
	},
	init: function() {
		if (!user) return;

		flickr.contacts.getList({user_id:user.nsid}, function(rsp, params, api) {
			if (!rsp) return;

			var $sel = $('#contact_optgroup');
			$sel.empty();
			if (!rsp.contacts || !rsp.contacts.contact) return;

			$.each(rsp.contacts.contact, function(i,ct) {
				$sel.append('<option value="'+ct.nsid+'" title="'+ct.realname+'">'+ct.username+'</option>');
			});
		});
	},
	onResize: function() {
		var s = gmap.getSize();
		var mw = parseInt(s.width/4);
		var mh = parseInt(s.height/4);

		this.$focus.css({top:mh*2-20, left:mw*2-20});
		this.$range_lt.css({top:mh, left:mw});
		this.$range_rb.css({top:mh*3, left:mw*3});

		this.$curmap_p.hide();
	},
	onMapDragend: function() {
		ui_ctl.savePosition();
		this.refreshLinks();

		if (!this.isNeedRefresh() || this.refresh !== 'auto') return;

		this.refreshPhotoGroup({page:1, updatepos:true, delay:true});
	},
	onMapZoomend: function() {
		ui_ctl.savePosition();

		this.refreshLinks();
		if (this.refresh !== 'auto') return;

		this.refreshPhotoGroup({page:1, updatepos:true, delay:true});
	},
	onActive: function() {
		this._center = this._timestamp = null;
		this.$p.show();
		this.$sw.addClass('sel');
		this.$focus.show();
		this.$range_lt.show();
		this.$range_rb.show();
		this.refresh_control.show();
		if (this.$myloc) {
			this.$myloc.show();
		}
		this.$curmap.show();
		this.refreshLinks();

		this.refreshPhotoGroup({updatepos:true});
	},
	onDeActive: function() {
		this.$p.hide();
		this.$sw.removeClass('sel');
		this.$focus.hide();
		this.$range_lt.hide();
		this.$range_rb.hide();
		this.refresh_control.hide();
		if (this.$myloc) {
			this.$myloc.hide();
		}
		this.$curmap.hide();
		this.$curmap_p.hide();
		this.clearGroupMarker();
		ui_ctl.endLoading();
	},

	isNeedRefresh: function(pos) {
		if (!this._center) return true;

		var bound=gmap.getBounds();
		if (!pos) {
			pos=bound.getCenter();
		}
		var span=bound.toSpan();

		var dx = Math.abs(pos.lng() - this._center.lng());
		var dy = Math.abs(pos.lat() - this._center.lat());
		if ((dx < 0.15*span.lng()) && (dy < 0.15*span.lat())) return false;

		return true;
	},
	fillPhotoList: function() {
		var innerpanel = common_ctl.formatPhotoList(this.curr_photo_list, this.viewas, true);
		$("#browse_photolist").empty().append(innerpanel).get(0).scrollTop = 0;
	},
	onGroupMarkerClick: function() {
		$.each(browse_mod._markers, function(i,m) {
			m.setImage(m.getIcon().image);
		});
		this.setImage(this.getIcon().image.replace('.png', 's.png'));

		browse_mod.curr_photo_list = this.photos;
		browse_mod.fillPhotoList();
		ui_ctl.expendPanel();
	},
	clearGroupMarker: function() {
		$.each(this._markers, function(i,ov) { gmap.removeOverlay(ov); });
		this._markers = [];
	},
	refreshPhotoGroupCallback: function(rsp, params, api) {
		if (browse_mod._timestamp !== params._timestamp || mod_ctl.getCurrentModCtl() !== browse_mod) {
			return;
		}

		try {
			if (!rsp) return;

			browse_mod.page = api.getPage(rsp);
			browse_mod.pages = api.getPages(rsp);
			common_ctl.makePager($('#browse_pager'), browse_mod.page, browse_mod.pages);

			var photos = [];
			api.parsePhotos(photos,rsp,true);

			browse_mod.clearGroupMarker();

			$.each(common_ctl.caculatePhotoGroups(photos), function(i,pg) {
				var marker = common_ctl.createGroupMarker(pg);
				GEvent.addListener(marker, "click", browse_mod.onGroupMarkerClick);
				browse_mod._markers.push(marker);
				gmap.addOverlay(marker);
			});

			browse_mod.curr_photo_list = photos;
			browse_mod.fillPhotoList();
		} finally {
			browse_mod.$curmap_p.hide();
			browse_mod.refreshLinks();
			ui_ctl.endLoading();
		}
	},
	refreshPhotoGroup: function(actopt, timestamp) {
		if (!timestamp) timestamp = this._timestamp = +new Date;
		if (this._timestamp !== timestamp) return;

		var that = this;

		mod_ctl.showmode.hide();

		if (actopt.delay) {
			actopt.delay = false;
			setTimeout( function() { that.refreshPhotoGroup(actopt, timestamp); }, 2000);
			return;
		}

		if (actopt.page) {
			this.page = actopt.page;
		}

		var pos = gmap.getCenter();
		this._center = pos;

		var acc = gmap.getZoom() - 3; // include larger accuracy
		if (acc < 1) acc = 1;
		if (acc > 16) acc = 16;

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


		var bbox = common_ctl.getRefreshRange(parseInt(this.$range_lt.css('left'),10), parseInt(this.$range_lt.css('top'),10), parseInt(this.$range_rb.css('left'),10), parseInt(this.$range_rb.css('top'),10));
		var opts = {min_taken_date:'1800-01-01', bbox:bbox, accuracy:acc, page:this.page, _timestamp:this._timestamp};

		var query = $.trim($('#browse_query').children(':text').val());
		if (query !== '') {
			opts.text = query;
		}

		var $tag_curr = $('#browse_taglist').find('.tag_curr');
		if ($tag_curr.size() > 0) {
			opts.tags = $tag_curr.text();
		}

		opts.per_page = this.perpage;

		if (this.sortby === 'posted') {
			opts.sort = 'date-posted-desc';
		} else if (this.sortby === 'interestingness') {
			opts.sort = 'interestingness-desc';
		}

		var browse_type = $('#browse_type').val();
		if (browse_type === 'user' && user) {
			opts.user_id = user.nsid;
		} else if (browse_type === 'video') {
			opts.media = 'videos';
		} else if (/^\d+@N\d+$/.exec(browse_type)) {
			opts.user_id = browse_type;
		}

		ui_ctl.beginLoading();
		flickr.photos.search(opts, this.refreshPhotoGroupCallback, !!user);
	},
	refreshLinks:function() {
		var $tag_curr = $('#browse_taglist').find('.tag_curr');
		if ($tag_curr.size() > 0) {
			this.$curmap.attr('href', '/flickr/#ll='+gmap.getCenter().toUrlValue()+'&z='+gmap.getZoom()+'&mod=browse&tag='+encodeURIComponent($tag_curr.text())+'&sort='+this.sortby+'&perpage='+this.perpage+'&page='+this.page);
		} else {
			this.$curmap.attr('href', '/flickr/#ll='+gmap.getCenter().toUrlValue()+'&z='+gmap.getZoom()+'&mod=browse&sort='+this.sortby+'&perpage='+this.perpage+'&page='+this.page);
		}
	}
};


var recent_mod = {
	_markers: [],
	create: function() {
		$('<a id="recent_switch" href="javascript:void(0)">Recent</a>').appendTo('#switch');
	},
	init: function() {
	},
	onResize: function() {},
	onActive: function() {
		flickr.panda.getPhotos({panda_name:'wang wang'}, function(rsp) {
			if (!rsp) return;
			var photos = [];
			flickr.parsePhotos(photos,rsp,true);

			var n=-90,s=90,e=-180,w=180;
			$.each(photos, function(i,p) {
				if (!p.hasGeo()) return;

				if (n < p.lat) n = p.lat;
				if (s > p.lat) s = p.lat;
				if (e < p.lng) e = p.lng;
				if (w > p.lng) w = p.lng;
			});

			var dh = (n-s)/10;
			var bounds = new GLatLngBounds(new GLatLng(s,w), new GLatLng(n+dh,e-dh));
			var zoom = gmap.getBoundsZoomLevel(bounds);

			gmap.setCenter(bounds.getCenter(), zoom);

			var pgrps = common_ctl.caculatePhotoGroups(photos);

			$.each(pgrps, function(i,pg) {
				if (pg.photos.length === 0) return;

				var marker = common_ctl.createGroupMarker(pg);
//				GEvent.addListener(marker, "click", recent_ctl.onGroupMarkerClick);
				recent_mod._markers.push(marker);
				gmap.addOverlay(marker);
			});
		});
	},
	onDeActive: function() {
		$.each(this._markers, function(i,ov) { gmap.removeOverlay(ov); });
		this._markers = [];
	}
};


var geotag_mod = {
	// must login
	page: 1,
	pages: 0,
	selected: [],
	curr_photo_list: null,
	curr_gpx: [],
	curr_marker: null,
	$p:null, $sw:null, $focus:null,
	perpage: '25',
	viewas: 'icons',

	create: function() {
		var that = this;
		this.$sw = $('<a id="geotag_switch" href="javascript:void(0)">GeoTagging</a>');
		this.$sw.appendTo('#switch');

		this.$p = $(
		'<div id="geotag_tab" class="tab">'+
			'<div class="tabrow" style="height:2em;">'+
				'<select id="geotag_filter">'+
					'<option value="0" title="Select">Select filter...</option>'+
					'<option value="all" title="All your content">All your content</option>'+
					'<option value="uploaded">Your recent uploaded content</option>'+
					'<option value="updated">Your recent updated content</option>'+
					'<option value="notag">Your non-tagged content</option>'+
					'<option value="noset">Your content not in a set</option>'+
					'<option value="geotag">Your geotagged content</option>'+
					'<option value="nogeotag">Your non-geotagged content</option>'+
//					'<option value="inrange">Your content in this range</option>'+
					'<optgroup label="Your sets" id="photoset_optgroup"></optgroup>'+
					'<optgroup label="Popular Tags" id="populartags_optgroup"></optgroup>'+
					'<optgroup label="Your groups" id="publicgroups_optgroup"></optgroup>'+
				'</select>'+
			'</div>'+
			'<div class="tabrow" style="height:4em;">'+
				'<span>Load GPX file:'+
					'<form id="geotag_upload_file_form" action="/gpxupload/preview" target="geotag_upload_file_iframe" enctype="multipart/form-data" method="post" style="display:inline;">'+
						'<input name="upload_file_input" type="file"/> <input id="geotag_upload_file_preview" type="submit" value="Show"/> <input id="geotag_upload_file_clear" type="submit" value="Clear"/>'+
					'</form>'+
					'<iframe name="geotag_upload_file_iframe" style="border:0 none; padding:0; height:0; width:0; position:absolute;"></iframe>'+
				'</span>'+
			'</div>'+
			'<div class="tabrow" style="height:2em;">'+
				'<span id="geotag_perpage" style="float:right;">'+
					'<span id="geotag_perpage_25" class="perpage_num">25</span><span id="geotag_perpage_50" class="perpage_num">50</span><span id="geotag_perpage_100" class="perpage_num">100</span><span id="geotag_perpage_200" class="perpage_num">200</span>'+
				'</span>'+
				'<span id="geotag_pager"></span>'+
			'</div>'+
			'<div class="tabrow" style="height:2em;">'+
				'<span id="geotag_viewas" style="float:right;">'+
					'<span id="geotag_viewas_icons" class="viewas_type" type="icons">Icons</span><span id="geotag_viewas_thumb" class="viewas_type" type="thumb">Thumbnail</span><span id="geotag_viewas_detail" class="viewas_type" type="detail">Detail</span>'+
				'</span>'+
				'<span id="geotag_operation" style="display:none;">'+
					'<a id="geotag_set_location" href="javascript:void(0)">Set Location</a> <a id="geotag_clear_location" href="javascript:void(0)">Clear Location</a>'+
				'</span>'+
			'</div>'+
			'<div id="geotag_photolist" class="photolist" style="top:10em;"></div>'+
		'</div>');
		this.$p.appendTo('#tabs');

		this.$focus = $('<div id="geotag_focus" class="range"><div class="vline" style="top:0px; left:20px; height:41px;"></div><div class="hline" style="top:20px; left:0px; width:41px;"></div></div>');

		gmap.getContainer().appendChild(this.$focus.get(0));
		this.onResize();



		$('#geotag_filter').change(function() {
			that.selected = [];
			$('#geotag_operation').hide();
			that.refreshPhotoList({page:1});
		});

		$('#geotag_set_location').click(function() {
			if (!confirm("Save Location?")) return;

			var ll = parseInt(that.$focus.css('left'),10);
			var tt = parseInt(that.$focus.css('top'),10);

			var latlng = gmap.fromContainerPixelToLatLng(new GPoint(ll+21, tt+21));
			var zoom = gmap.getZoom();
			if (zoom < 1) zoom = 1;
			if (zoom > 16) zoom = 16;

			//ui_ctl.beginLoading();
			var total = that.selected.length;
			ui_ctl.showSaving('Saving 1 / ' + total);

			var opts = { photo_id:that.selected[0], lat:latlng.lat(), lon:latlng.lng(), accuracy:zoom, _photo_ids:that.selected.concat(), _failed:[] };
			flickr.photos.geo.setLocation( opts, function(rsp, params, api) {
				if (!rsp) {
					params._failed.push(params.photo_id);
				}

				params._photo_ids.shift();

				if (params._photo_ids.length > 0) {
					params.photo_id = params._photo_ids[0];
					ui_ctl.showSaving('Saving '+ (total - params._photo_ids.length + 1) +' / ' + total);
					flickr.photos.geo.setLocation( params, arguments.callee);
					return;
				}

				ui_ctl.hideSaving();

				that.selected = [];
				$('#geotag_operation').hide();
				that.refreshPhotoList({});

				if (params._failed.length > 0) {
					ui_ctl.on_message('Saved. ' + params._failed + ' failed.');
				} else {
					ui_ctl.on_message('Save Success.');
				}

				that.hideCurrMarker();
			});
		});

		$('#geotag_clear_location').click(function() {
			if (!confirm("Remove Location?")) return;

			//ui_ctl.beginLoading();
			var total = that.selected.length;
			ui_ctl.showSaving('Removing 1 / ' + total);

			var opts = {photo_id:that.selected[0], _photo_ids:that.selected.concat(), _failed:[]};
			flickr.photos.geo.removeLocation( opts, function(rsp, params, api) {
				if (!rsp) {
					params._failed.push(params.photo_id);
				}

				params._photo_ids.shift();

				if (params._photo_ids.length > 0) {
					params.photo_id = params._photo_ids[0];
					ui_ctl.showSaving('Removing '+ (total - params._photo_ids.length + 1) +' / ' + total);
					flickr.photos.geo.removeLocation(params, arguments.callee);
					return;
				}

				ui_ctl.hideSaving();

				that.selected = [];
				$('#geotag_operation').hide();
				that.refreshPhotoList({});

				if (params._failed.length > 0) {
					ui_ctl.on_message('Remove Location. ' + params._failed + ' failed.');
				} else {
					ui_ctl.on_message('Remove Location Success.');
				}

				that.hideCurrMarker();
			});
		});

		$('#geotag_tab').click(function(e) {
			var clickon = e.target.tagName+':'+e.target.className;

			switch (clickon) {
			case 'SPAN:pager_prev': {
				if (that.page - 1 > 0) {
					that.refreshPhotoList({page:that.page-1});
				}
				break;
			}
			case 'SPAN:pager_num': {
				var page = parseInt($(e.target).text(),10);
				if (page === that.page) break;

				that.refreshPhotoList({page:page});
				break;
			}
			case 'SPAN:pager_next': {
				if (that.page + 1 <= that.pages) {
					that.refreshPhotoList({page:that.page-1});
				}
				break;
			}
			case 'SPAN:perpage_num': {
				$('#geotag_perpage').find('span').attr('class', 'perpage_num');
				that.perpage = $(e.target).attr('class', 'perpage_curr').attr('id').replace(/geotag_perpage_/, '');
				mod_ctl.save_setting();
				that.refreshPhotoList({page:1});
				break;
			}
			case 'SPAN:viewas_type': {
				$('#geotag_viewas').find('span').attr('class', 'viewas_type');
				that.viewas = $(e.target).attr('class', 'viewas_curr').attr('type');
				mod_ctl.save_setting();
				if (!that.curr_photo_list) break;

				that.fillPhotoList();
				break;
			}
			case 'INPUT:geotag_sel': {
				var photo = e.target.parentNode.photo;
				if (e.target.checked) {
					that.selected.push(photo.id);
				} else {
					var idx = that.selected.indexOf(photo.id);
					if (idx >= 0) {
						that.selected.splice(idx, 1);
					}
				}

				if (that.selected.length > 0) {
					$('#geotag_operation').show();
				} else {
					$('#geotag_operation').hide();
				}
				break;
			}
			case 'IMG:pos': {
				var photo = e.target.parentNode.parentNode.photo;
				if (!photo || !photo.hasGeo()) break;

				mod_ctl.showmode.hide();
				that.showCurrMarker(common_ctl.createIconMarker(photo));
				gmap.setCenter(new GLatLng(photo.lat,photo.lng), photo.acc);

				break;
			}
			case 'IMG:f_icon':
			case 'IMG:f_thumb':
			case 'DIV:imgtitle': {
				var p = e.target.parentNode.parentNode.parentNode.photo;
				if (!p) break;

				mod_ctl.showmode.showPhoto(p);
				return false;
			}
			}
		});

		$('#geotag_upload_file_clear').click(function() {
			that.hideGPX(true);
			return false;
		});
		$('#geotag_upload_file_preview').click(function() {
			ui_ctl.beginLoading();
			$('#geotag_upload_file_form').attr('action','/gpxupload/preview?cb=window.parent.geotag_parse_upload_gpx').submit();
			return false;
		});
		window.geotag_parse_upload_gpx = function(rsp) { try {
			if (!mod_ctl) return;

			if (!rsp) {
				ui_ctl.on_error(rsp.message);
			} else {
				that.showGPX(rsp.gpx);
			}
		} finally { ui_ctl.endLoading(); }};

//	$('#phoset_upload_file_clear').click(function() {
//		mod_ctl.getModCtl('phoset').hideGPX(true);
//		return false;
//	});
//	$('#phoset_upload_file_preview').click(function() {
//		ui_ctl.beginLoading();
//		$('#phoset_upload_file_form').attr('action','/gpxupload/preview?cb=window.parent.phoset_gpx_preview').submit();
//		return false;
//	});
//	window.phoset_gpx_preview = function(rsp) {
//		try {
//			if (!mod_ctl) return;
//
//			if (rsp.stat !== 'ok') {
//				ui_ctl.on_error(rsp.message);
//			} else {
//				mod_ctl.getModCtl('phoset').showGPX(rsp.gpx);
//			}
//		} finally {
//			ui_ctl.endLoading();
//		}
//	};
//
//	$('#phoset_upload_file_save').click(function() {
//		ui_ctl.beginLoading();
//		$('#phoset_upload_file_form').attr('action','/gpxupload/save?cb=window.parent.phoset_gpx_save').submit();
//		return false;
//	});
//	window.phoset_gpx_save = function(rsp) {
//		try {
//		} finally {
//			ui_ctl.endLoading();
//		}
//	};

	},
	load_setting: function(setting) {
		if (setting.geotag_perpage) this.perpage = setting.geotag_perpage;
		if (setting.geotag_viewas) this.viewas = setting.geotag_viewas;
		$('#geotag_perpage').find('span').attr('class', 'perpage_num');
		$('#geotag_perpage_'+this.perpage).attr('class', 'perpage_curr');
		$('#geotag_viewas').find('span').attr('class', 'viewas_type');
		$('#geotag_viewas_'+this.viewas).attr('class', 'viewas_curr');
	},
	save_setting: function(setting) {
		setting.geotag_perpage = this.perpage;
		setting.geotag_viewas = this.viewas;
	},
	init: function() {
		flickr.photosets.getList( {user_id:user.nsid}, function(rsp, params, api) {
			if (!rsp || !rsp.photosets || !rsp.photosets.photoset) return;

			var $sel = $('#photoset_optgroup').empty();
			$.each(rsp.photosets.photoset, function(i,ps) { $sel.append('<option value="set-'+ps.id+'" title="'+ps.description._content+'">'+ps.title._content+' ('+ps.photos+')</option>'); });
		});
		flickr.people.getPublicGroups( {user_id:user.nsid}, function(rsp, params, api) {
			if (!rsp || !rsp.groups || !rsp.groups.group) return;

			var $sel = $('#publicgroups_optgroup').empty();
			$.each(rsp.groups.group, function(i,gp) { $sel.append('<option value="grp-'+gp.nsid+'">'+gp.name+'</option>'); });
		});
		flickr.tags.getListUserPopular( {user_id:user.nsid}, function(rsp, params, api) {
			if (!rsp || !rsp.who || !rsp.who.tags || !rsp.who.tags.tag) return;

			var $sel = $('#populartags_optgroup').empty();
			$.each(rsp.who.tags.tag, function(i,t) { $sel.append('<option value="tag-'+t._content+'">'+t._content+'</option>'); });
		});
	},
	onResize: function() {
		var s = gmap.getSize();
		var mw = parseInt(s.width/4);
		var mh = parseInt(s.height/4);

		this.$focus.css({top:mh*2-20, left:mw*2-20});
	},
	onMapDragend: function() {
		ui_ctl.savePosition();
	},
	onMapZoomend: function() {
		ui_ctl.savePosition();
	},
	onActive: function() {
		this.$p.show();
		this.$sw.addClass('sel');
		this.showCurrMarker();
		this.showGPX();
		this.$focus.show();
	},
	onDeActive: function() {
		this.$p.hide();
		this.$sw.removeClass('sel');
		this.hideCurrMarker();
		this.hideGPX();
		this.$focus.hide();
	},

	hideCurrMarker: function(is_clear) {
		if (this.curr_marker) {
			gmap.removeOverlay(this.curr_marker);
		}
		if (is_clear) {
			this.curr_marker = null;
		}
	},
	showCurrMarker: function(marker) {
		if (marker) {
			this.hideCurrMarker(true);
			this.curr_marker = marker;
		}
		if (this.curr_marker) {
			gmap.addOverlay(this.curr_marker);
		}
	},
	hideGPX: function(is_clear) {
		$.each(this.curr_gpx, function(i,ov) { gmap.removeOverlay(ov); });
		if (is_clear) {
			this.curr_gpx = [];
		}
	},
	showGPX: function(gpx) {
		if (gpx) {
			this.hideGPX(true);

			var bound = common_ctl.parseGPX(gpx, this.curr_gpx);

			var zoom = gmap.getBoundsZoomLevel(bound);
			gmap.setCenter(bound.getCenter(), zoom);
		}

		$.each(this.curr_gpx, function(i,ov) { gmap.addOverlay(ov); });
	},
	fillPhotoList: function() {
		var innerpanel = common_ctl.formatPhotoList(this.curr_photo_list, this.viewas, false, true, true, this.selected);
		$("#geotag_photolist").empty().append(innerpanel).get(0).scrollTop = 0;
	},
	onRefreshPhotoList: function(rsp, params, api) { try {
		if (!rsp) return;

		geotag_mod.page = api.getPage(rsp);
		geotag_mod.pages = api.getPages(rsp);
		common_ctl.makePager($('#geotag_pager'), geotag_mod.page, geotag_mod.pages);

		var photos = [];
		api.parsePhotos(photos,rsp);
		$.each(photos, function(k,v) {
			v.oi = user.nsid;
		});

		geotag_mod.curr_photo_list = photos;
		geotag_mod.fillPhotoList();
	} finally { ui_ctl.endLoading(); }
	},
	refreshPhotoList: function(actopt) {
		if (actopt.page) {
			this.page = actopt.page;
		}

		var opts = {page:this.page};
		opts.per_page = this.perpage;

		var filter = $("#geotag_filter").val();
		if (filter === 'all') {
			opts.user_id = user.nsid;
			opts.sort = 'date-posted-desc';
			ui_ctl.beginLoading();
			flickr.photos.search(opts, this.onRefreshPhotoList, true);
		} else if (filter === 'uploaded') {
			opts.user_id = user.nsid;
			opts.min_upload_date = parseInt((+new Date)/1000-30*24*60*60,10);
			opts.sort = 'date-posted-desc';
			ui_ctl.beginLoading();
			flickr.photos.search(opts, this.onRefreshPhotoList, true);
		} else if (filter === 'updated') {
			opts.min_date = parseInt((+new Date)/1000-30*24*60*60,10);
			ui_ctl.beginLoading();
			flickr.photos.recentlyUpdated(opts, this.onRefreshPhotoList);
		} else if (filter === 'notag') {
			ui_ctl.beginLoading();
			flickr.photos.getUntagged(opts, this.onRefreshPhotoList);
		} else if (filter === 'noset') {
			ui_ctl.beginLoading();
			flickr.photos.getNotInSet(opts, this.onRefreshPhotoList);
		} else if (filter === 'geotag') {
			ui_ctl.beginLoading();
			flickr.photos.getWithGeoData(opts, this.onRefreshPhotoList);
		} else if (filter === 'nogeotag') {
			ui_ctl.beginLoading();
			flickr.photos.getWithoutGeoData(opts, this.onRefreshPhotoList);
/*		} else if (filter === 'inrange') {
			opts.user_id = user.nsid;
			opts.bbox = common_ctl.getRefreshRange();
			opts.sort = 'date-posted-desc';
			ui_ctl.beginLoading();
			flickr.photos.search(opts, geotag_ctl.onRefreshPhotoList, true);
*/
		} else if (/^set\-(\d+)$/.exec(filter)) {
			opts.photoset_id = RegExp.$1;
			ui_ctl.beginLoading();
			flickr.photosets.getPhotos(opts, this.onRefreshPhotoList, true);
		} else if (/^tag\-(.+)$/.exec(filter)) {
			opts.user_id = user.nsid;
			opts.tags = RegExp.$1;
			opts.sort = 'date-posted-desc';
			ui_ctl.beginLoading();
			flickr.photos.search(opts, this.onRefreshPhotoList, true);
		} else if (/^grp\-([a-zA-Z0-9\-\_@]+)$/.exec(filter)) {
			opts.user_id = user.nsid;
			opts.group_id = RegExp.$1;
			ui_ctl.beginLoading();
			flickr.groups.pools.getPhotos(opts, this.onRefreshPhotoList, true);
		} else {
			return;
		}
	}
};


var phoset_mod = {
	// must login
	photos: [],
	curr_phoset: null,
	curr_photo_list: null,
//	curr_gpx: [],
	_markers: [],
	$p:null, $sw:null, $curmap:null, $curmap_p:null,
	viewas: 'icons',

	create: function() {
		var that = this;
		this.$sw = $('<a id="phoset_switch" href="javascript:void(0)">Photoset</a>');
		this.$sw.appendTo('#switch');

		this.$p = $(
		'<div id="phoset_tab" class="tab">'+
			'<div class="tabrow" style="height:2em;">'+
				'<select id="phoset_photoset_list">'+
					'<option value="0" title="Select">Select photoset...</option>'+
				'</select>'+
			'</div>'+
//			'<div class="tabrow">'+
//				'<span>Load GPX file:'+
//					'<form id="phoset_upload_file_form" action="/gpxupload/preview" target="phoset_upload_file_iframe" enctype="multipart/form-data" method="post" style="display:inline;">'+
//						'<input name="upload_file_input" type="file"/> <input id="phoset_upload_file_preview" type="submit" value="Show"/> <input id="phoset_upload_file_clear" type="submit" value="Clear"/> <input id="phoset_upload_file_save" type="submit" value="Save"/>'+
//					'</form>'+
//					'<iframe name="phoset_upload_file_iframe" style="border:0 none; padding:0; height:0; width:0; position:absolute;"></iframe>'+
//				'</span>'+
//			'</div>'+
			'<div class="tabrow" style="height:2em;">'+
				'<span id="phoset_viewas" style="float:right;">'+
					'<span id="phoset_viewas_icons" class="viewas_type" type="icons">Icons</span><span id="phoset_viewas_thumb" class="viewas_type" type="thumb">Thumbnail</span><span id="phoset_viewas_detail" class="viewas_type" type="detail">Detail</span>'+
				'</span>'+
			'</div>'+
			'<div id="phoset_photolist" class="photolist" style="top:4em;"></div>'+
		'</div>');
		this.$p.appendTo('#tabs');

		this.$curmap = $('<a id="links_photoset" style="display:none;"><img class="link" src="/images/transparent.png"/>Link</a>');
		this.$curmap.appendTo('#links');


		this.$p.find('#phoset_photoset_list').change(function() {
			if (! /^set\-(\d+)$/.exec($(this).val())) return;

			that.curr_phoset = RegExp.$1;
			that.$curmap.attr('href', '/show?fset='+that.curr_phoset).show();
			that.loadPhotoSet(that.curr_phoset);
		});

		this.$p.click(function(e) {
			var clickon = e.target.tagName+':'+e.target.className;

			switch (clickon) {
			case 'SPAN:viewas_type': {
				$('#phoset_viewas').find('span').attr('class', 'viewas_type');
				that.viewas = $(e.target).attr('class', 'viewas_curr').attr('type');
				mod_ctl.save_setting();
				if (!that.curr_photo_list) return;

				that.fillPhotoList();
				break;
			}

			case 'IMG:f_icon':
			case 'IMG:f_thumb':
			case 'DIV:imgtitle': {
				var p = e.target.parentNode.parentNode.parentNode.photo;
				if (!p) return;

				mod_ctl.showmode.showPhoto(p);
				return false;
			}
			}
		});


		this.$curmap.click(function() { try {
			that.$curmap_p.find('#links_photoset_url').val(this.href);
			that.$curmap_p.find('#links_photoset_html').val('<iframe width="425" height="350" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="'+this.href+'"></iframe>');
			that.$curmap_p.show();
		} finally { return false; }});

		this.$curmap_p = $('<div id="links_photoset_panel" class="popup_panel" style="position:absolute; top:27px; right:10px; z-index:7; padding:5px 5px 10px 10px; display:none;">'+
			'<img class="close" src="/images/transparent.png" style="float:right;"/>'+
			'<div>Paste link in <b>email</b> or <b>IM</b><br/>'+
			'<input id="links_photoset_url" type="text" tabindex="400" style="width:29em;"/></div>'+
			'<div>Paste HTML to embed in website<br/>'+
			'<input id="links_photoset_html" type="text" tabindex="401" style="width:29em;"/></div>'+
		'</div>');
		this.$curmap_p.appendTo('#mainbar');
		this.$curmap_p.find('.close').click(function(){ that.$curmap_p.hide(); });
		this.$curmap_p.find('input').click(function(){ this.select(); });
	},
	load_setting: function(setting) {
		if (setting.phoset_viewas) this.viewas = setting.phoset_viewas;
		$('#phoset_viewas').find('span').attr('class', 'viewas_type');
		$('#phoset_viewas_'+this.viewas).attr('class', 'viewas_curr');
	},
	save_setting: function(setting) {
		setting.phoset_viewas = this.viewas;
	},
	init: function() {
		flickr.photosets.getList( {user_id:user.nsid}, function(rsp, params, api) {
			if (!rsp || !rsp.photosets || !rsp.photosets.photoset) return;

			var $sel = $('#phoset_photoset_list');
			$.each(rsp.photosets.photoset, function(i, ps) { $sel.append('<option value="set-'+ps.id+'" title="'+ps.description._content+'">'+ps.title._content+' ('+ps.photos+')</option>'); });
		});
	},
	onResize: function() {
	},
	onMapDragend: function() {
	},
	onMapZoomend: function() {
		this.regroupPhotos();
	},
	onActive: function() {
		this.$p.show();
		this.$sw.addClass('sel');
//		this.showGPX();
		this.loadGroupMarker();
		this.$curmap_p.hide();

		if (this.curr_phoset) {
			this.$curmap.show();
		}
	},
	onDeActive: function() {
		this.$p.hide();
		this.$sw.removeClass('sel');
//		this.hideGPX();
		this.clearGroupMarker();
		this.$curmap_p.hide();
		this.$curmap.hide();
		ui_ctl.endLoading();
	},

	loadPhotoSet: function(photoset_id) {
		var that = this;
		ui_ctl.beginLoading();
		this.photos = [];

		var issign = (user) ? true : false;
		flickr.photosets.getPhotos( {photoset_id:photoset_id, page:1, per_page:200}, function(rsp, params, api) {
			if (mod_ctl.getCurrentMod() !== 'phoset') {
				return;
			}

			var isfinal = false;
			try {

				if (!rsp) return;

				var page = api.getPage(rsp);
				var pages = api.getPages(rsp);

				$.each(rsp.photoset.photo, function(i,p) { p.owner = rsp.photoset.owner; });
				api.parsePhotos(that.photos,rsp,true);

				that.regroupPhotos(true);

				if ( page < pages) {
					params.page = page + 1;
					flickr.photosets.getPhotos(params, arguments.callee, issign);
					return;
				}

				isfinal = true;

				if (that.photos.length === 0) {
					ui_ctl.on_error('This set have no geotagged photo.');
				}
			} finally {
				if (isfinal) {
					ui_ctl.endLoading();
				}
			}
		}, issign);
	},

	clearGroupMarker: function() { $.each(this._markers, function(i,m) { gmap.removeOverlay(m); }); },
	loadGroupMarker: function() { $.each(this._markers, function(i,m) { gmap.addOverlay(m); }); },

	regroupPhotos: function(fit_view) {
		if (this.photos.length == 0) return;

		var that = this;
		if (fit_view) {
			var n=-90,s=90,e=-180,w=180;
			$.each(this.photos, function(i,p) {
				if (!p.hasGeo()) return;

				if (n < p.lat) n = p.lat;
				if (s > p.lat) s = p.lat;
				if (e < p.lng) e = p.lng;
				if (w > p.lng) w = p.lng;
			});

			var dh = (n-s)/10;
			var bounds = new GLatLngBounds(new GLatLng(s,w), new GLatLng(n+dh,e-dh));
			var zoom = gmap.getBoundsZoomLevel(bounds);

			gmap.setCenter(bounds.getCenter(), zoom);
		}

		var pgrps = common_ctl.caculatePhotoGroups(this.photos);

		this.clearGroupMarker();
		this._markers = [];

		$.each(pgrps, function(i,pg) {
			if (pg.photos.length === 0) return;

			var marker = common_ctl.createGroupMarker(pg);
			GEvent.addListener(marker, "click", that.onGroupMarkerClick);
			that._markers.push(marker);
			gmap.addOverlay(marker);
		});
	},

	fillPhotoList: function() {
		var innerpanel = common_ctl.formatPhotoList(this.curr_photo_list, this.viewas, false);
		$("#phoset_photolist").empty().append(innerpanel).get(0).scrollTop = 0;
	},

	onGroupMarkerClick: function() {
		phoset_mod.curr_photo_list = this.photos;
		phoset_mod.fillPhotoList();
		ui_ctl.expendPanel();
	}

//	hideGPX: function(is_clear) {
//		$.each(phoset_ctl.curr_gpx, function(i,ov) { gmap.removeOverlay(ov); });
//		if (is_clear)
//		phoset_ctl.curr_gpx = [];
//	},
//	showGPX: function(gpx) {
//		if (gpx) {
//			phoset_ctl.hideGPX(true);
//
//			var bound = common_ctl.parseGPX(gpx, phoset_ctl.curr_gpx);
//
//			var zoom = gmap.getBoundsZoomLevel(bound);
//			gmap.setCenter(bound.getCenter(), zoom);
//		}
//
//		$.each(phoset_ctl.curr_gpx, function(i,ov) { gmap.addOverlay(ov); });
//	}
};


var show_mod = {
	_photosets: [],
	curr_photo_list: null,
	_markers: [],
	$p:null,

	create: function() {
		var that = this;
		this.$p = $(
		'<div id="show_tab" class="tab">'+
			'<div id="show_photolist" class="photolist" style="top:.5em;"></div>'+
		'</div>');
		this.$p.appendTo('#tabs');

		$('#show_title_dropdn_toggle').click(function() {
			$('#show_title_dropdn').slideToggle('fast');
		});
		$('#show_title_dropdn').click(function(e) {
			var clickon = e.target.tagName+':'+e.target.className;

			switch (clickon) {
			case 'INPUT:photoset': {
				e.target.parentNode.photoset.show = e.target.checked;
				that.refreshTitle();
				that.regroupPhotos();
				break;
			}
			}
		});
		$('#show_tab').click(function(e) {
			var clickon = e.target.tagName+':'+e.target.className;

			switch (clickon) {
			case 'IMG:f_icon':
			case 'IMG:f_thumb':
			case 'DIV:imgtitle': {
				var p = e.target.parentNode.parentNode.parentNode.photo;
				if (!p) return;

				mod_ctl.showmode.showPhoto(p);
				return false;
			}
			}
		});
	},
	load_setting: function(setting) {
	},
	save_setting: function(setting) {
	},
	init: function() {
	},
	onResize: function() {
	},
	onMapDragend: function() {
	},
	onMapZoomend: function() {
		this.regroupPhotos();
	},
	onActive: function() {
		this.$p.show();
		this.loadGroupMarker();
	},
	onDeActive: function() {
		this.$p.hide();
		this.clearGroupMarker();
	},

	refreshTitle: function() {
		var t = '';
		$.each(this._photosets, function(i,photoset) {
			if (photoset.show) {
				t += '<a target="_blank" href="http://www.flickr.com/photos/'+photoset.owner+'/sets/'+photoset.id+'/">'+photoset.title+'</a>';
			}
		});
		$('#settitle').html(t);
	},

	loadPhotoSet: function(photoset_id) {
		var that = this;
		var photoset = {id:photoset_id, title:'', owner:'', photos:[], show:true};

		ui_ctl.beginLoading();

		flickr.photosets.getInfo({_photoset:photoset, photoset_id:photoset_id}, function(rsp, params) {
			if (!rsp || !rsp.photoset || params._photoset.id != rsp.photoset.id) return;

			params._photoset.owner = rsp.photoset.owner;
			params._photoset.title = rsp.photoset.title._content;
			params._photoset.imgurl = 'http://farm'+rsp.photoset.farm+'.static.flickr.com/'+rsp.photoset.server+'/'+rsp.photoset.primary+'_'+rsp.photoset.secret+'_s.jpg';

			that._photosets.push(params._photoset);

			$phosel = $('<div><input class="photoset" type="checkbox" checked="true"></input> <img style="width:30px;height:30px;" src="'+params._photoset.imgurl+'"/> '+params._photoset.title+'</div>');
			$('#show_title_dropdn').append($phosel.get(0));
			$phosel.get(0).photoset = params._photoset;

			that.refreshTitle();

			params.page = 1;
			params.per_page = 200;

			flickr.photosets.getPhotos(params, function(rsp, params, api) {
				var isfinal = false;
				try {
					if (!rsp) return;

					var page = api.getPage(rsp);
					var pages = api.getPages(rsp);

					$.each(rsp.photoset.photo, function(i,p) { p.owner = rsp.photoset.owner; });
					api.parsePhotos(params._photoset.photos,rsp,true);

					that.regroupPhotos(true);

					if ( page < pages) {
						params.page = page + 1;
						flickr.photosets.getPhotos(params, arguments.callee);
						return;
					}

					isfinal = true;

					if (params._photoset.length === 0) {
						ui_ctl.on_error('This set have no geotagged photo.');
					}
				} finally {
					if (isfinal) {
						ui_ctl.endLoading();
					}
				}
			});
		});
	},
	loadPhoto: function(photo_ids) {
		ui_ctl.beginLoading();

		var photos = [];

		$.each(photo_ids, function(k,v) {
			flickr.photos.getInfo({photo_id:v}, function(rsp) {
				if (!rsp) return;

				var p = new FlickrPhoto(rsp.photo);
				p.t = rsp.photo.title._content;
				p.lat = parseFloat(rsp.photo.location.latitude);
				p.lng = parseFloat(rsp.photo.location.longitude);
				p.acc = parseInt(rsp.photo.location.accuracy,10);
				p.du = parseInt(rsp.photo.dates.posted,10);
				p.dt = rsp.photo.dates.datetaken;
				p.oi = rsp.photo.owner.nsid;
				p.on = rsp.photo.owner.username;
				p.med = rsp.photo.media;
				if (!p.hasGeo()) {
					return;
				}

				flickr.people.getInfo({user_id:p.oi}, function(rsp) { try {
					if (!rsp) return;

					p.inf = rsp.person.iconfarm;
					p.ins = rsp.person.iconserver;

					gmap.setCenter(new GLatLng(p.lat, p.lng), p.acc);

					var icon = new GIcon(), siz;
					icon.transparent= "/images/transparent.png";
					icon.label = {url:p.getIconUrl()};
					icon.label.anchor = new GPoint(4,4);
					siz = 42;
					icon.image = "/images/mbg"+siz+"x"+siz+".png";
					icon.iconSize = new GSize(siz, siz);
					icon.iconAnchor = new GPoint(siz/2, siz/2);
					icon.label.size = new GSize(siz-8,siz-8);

					var marker = new GMarker(new GLatLng(p.lat, p.lng), {icon:icon});
					GEvent.addListener(marker, "click", function() {
						mod_ctl.showmode.showPhoto(p);
					});
					gmap.addOverlay(marker);
				} finally {
					ui_ctl.endLoading();
				}});
			});
		});
	},
	clearGroupMarker: function() {
		$.each(this._markers, function(i,m) { gmap.removeOverlay(m); });
	},
	loadGroupMarker: function() {
		$.each(this._markers, function(i,m) { gmap.addOverlay(m); });
	},
	regroupPhotos: function(fit_view) {
		if (this._photosets.length == 0) return;

		var that = this;
		var photos = [];
		$.each(this._photosets, function(i,photoset) {
			if (!photoset.show) return;

			$.each(photoset.photos, function(i,p) {
				photos.push(p);
			});
		});

		if (fit_view) {
			var n=-90,s=90,e=-180,w=180;
			$.each(photos, function(i,p) {
				if (!p.hasGeo()) return;

				if (n < p.lat) n = p.lat;
				if (s > p.lat) s = p.lat;
				if (e < p.lng) e = p.lng;
				if (w > p.lng) w = p.lng;
			});

			var dh = (n-s)/10;
			var bounds = new GLatLngBounds(new GLatLng(s,w), new GLatLng(n+dh,e-dh));
			var zoom = gmap.getBoundsZoomLevel(bounds);

			gmap.setCenter(bounds.getCenter(), zoom);
		}

		var pgrps = common_ctl.caculatePhotoGroups(photos);

		this.clearGroupMarker();
		this._markers = [];

		$.each(pgrps, function(i,pg) {
			if (pg.photos.length === 0) return;

			var marker = common_ctl.createGroupMarker(pg);
			GEvent.addListener(marker, "click", that.onGroupMarkerClick);
			that._markers.push(marker);
			gmap.addOverlay(marker);
		});
	},
	fillPhotoList: function() {
		var innerpanel = common_ctl.formatPhotoList(this.curr_photo_list, 'thumb');
		$("#show_photolist").empty().append(innerpanel).get(0).scrollTop = 0;
	},
	onGroupMarkerClick: function() {
		$.each(show_mod._markers, function(i,m) {
			m.setImage(m.getIcon().image);
		});
		this.setImage(this.getIcon().image.replace('.png', 's.png'));

		show_mod.curr_photo_list = this.photos;
		show_mod.fillPhotoList();
		ui_ctl.expendPanel();
	}
};


mod_ctl = {
	mods: {browse:browse_mod, recent:recent_mod, geotag:geotag_mod, phoset:phoset_mod, show:show_mod},
	curr_mods: [],
	last_mod: null,
	showmode: null,
	getModCtl: function(mod) { return this.mods[mod]; },
	getCurrentMod: function() { return this.last_mod; },
	getCurrentModCtl: function() { return this.mods[this.last_mod]; },
	init: function(mods) {
		var that = this;
		$.each(gmap.getMapTypes(), function(k,v) {
			v.getMinimumResolution = function() { return 2; };
		});

		$.each(mods, function(k,v) {
			that.mods[v].create();
			that.curr_mods.push(that.mods[v]);
		});

		GEvent.addListener(gmap, "dragend", function() {
			var mod = that.getCurrentModCtl();
			if (!mod || !mod.onMapDragend) return;

			return mod.onMapDragend();
		});
		GEvent.addListener(gmap, "zoomend", function() {
			var mod = that.getCurrentModCtl();
			if (!mod || !mod.onMapZoomend) return;

			return mod.onMapZoomend();
		});

		showpanel_ctl.init();
		this.showmode = showpanel_ctl;
	},
	load_setting: function() {
		var sett = {};
		try {
			var str = $.cookie('settings');
			if (str)
				sett = eval('('+str+')');
		} catch (e) {}

		if (/^#ll=([\-\d\,\.]+)&z=(\d+)(.*)$/.exec(location.hash)) {
			var params = RegExp.$3;
//			if (/mod=([a-z]+)/.exec(params))  sett.mode = RegExp.$1;
			if (/sort=([a-z]+)/.exec(params)) sett.browse_sortby = RegExp.$1;
			if (/perpage=(\d+)/.exec(params)) sett.browse_perpage = RegExp.$1;
		}

		$.each(mod_ctl.curr_mods, function(k,v) {
			v.load_setting(sett);
		});
	},
	save_setting: function() {
//		if (user) { // don't change mode setting when not sign in.
//			this.mode = mod_ctl.getCurrentMod();
//		}

		var sett = {};
		$.each(mod_ctl.curr_mods, function(k,v) {
			v.save_setting(sett);
		});
		var ss = [];
		$.each(sett, function(k,v) {
			ss.push(k+':"'+v+'"');
		});
		$.cookie('settings', '{'+ss.join(',')+'}', {expires:365});
	},
	onResize: function() {
		$.each(mod_ctl.curr_mods, function(k,v) {
			v.onResize();
		});
	},
	switchTo: function(mod) {
		if (mod === this.last_mod) return;
		if (this.last_mod) {
			this.getCurrentModCtl().onDeActive();
		}
		this.last_mod = mod;
		if (!this.getCurrentModCtl().__inited) {
			this.getCurrentModCtl().__inited = true;
			this.getCurrentModCtl().init();
		}
		this.getCurrentModCtl().onActive();

		mod_ctl.showmode.hide();
		return this.getCurrentModCtl();
	}
};
})();

