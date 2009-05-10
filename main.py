import os
import logging
import math
import cgi
import hashlib
import urllib
import re
from xml.dom import minidom 

from google.appengine.api import memcache
from google.appengine.api.urlfetch import fetch

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

import sessions
import json


class FlickrError(Exception): pass

class Flickr(object):
  API_KEY = 'bde30c9a6b136fee3e6f7b9b6fa0117c'
  API_SECRET = '7fbfea9ba5a11e5f'

  @staticmethod
  def auth_loginUrl(perms='read'):
    sigstr = "%sapi_key%sperms%s" % (Flickr.API_SECRET, Flickr.API_KEY, perms)
    return "http://flickr.com/services/auth?api_key=%s&perms=%s&api_sig=%s" % (Flickr.API_KEY, perms ,hashlib.md5(sigstr).hexdigest())

  def __init__(self):
    self.auth_token = None
    self.user = None

  def signurl(self, params, issig):
    params['api_key'] = Flickr.API_KEY

    rr = [ (k,params[k]) for k in sorted(params.keys())]

    if issig:
      if not self.auth_token is None:
        params['auth_token'] = self.auth_token
        rr.append(('auth_token',self.auth_token))
      keys = params.keys()
      keys.sort()
      p = [Flickr.API_SECRET]
      for key in keys:
        p.append(key)
        p.append(str(params[key]))

      rr.append(('api_sig',hashlib.md5(''.join(p)).hexdigest()))

    req = ''
    for r in rr:
      if not req == '':
        req += '&'
      req += urllib.quote_plus(r[0])
      req += '='
      req += urllib.quote_plus(r[1])

    url = "http://flickr.com/services/rest?%s" % req
    return url


  def auth_getToken(self, frob):
    url = self.signurl({'method':'flickr.auth.getToken','frob':frob,'format':'json','nojsoncallback':'1'}, True)
    res = fetch(url)
    data = json.read(res.content)

    if not data['stat'] == 'ok':
      raise FlickrError, "ERROR [%s]: %s" % (data['code'], data['message'])
		
    self.auth_token = str(data['auth']['token']['_content'])
    self.user = data['auth']['user']
    return True
		
  def auth_logout(self):
    self.auth_token = None
    self.user = None
    return True




class MainPage(webapp.RequestHandler):
  def get(self):
    self.redirect('/flickr/')

class FlickrHandler(webapp.RequestHandler):
  def __init__(self):
    self.session = sessions.Session()

  def get(self, action):
    if action == '':
      val = {'API_KEY':Flickr.API_KEY}

      if 'flickr' in self.session:
        flickr = self.session['flickr']
        val['user'] = flickr.user
      else:
        autologin = self.request.cookies.get('autologin', '')
        if autologin == 'true':
          self.redirect('/flickr/login')
          return

      path = os.path.join(os.path.dirname(__file__), 'flickr.html')
      self.response.headers.add_header("Expires", "Tue, 01 Jan 1980 1:00:00 GMT")
      self.response.headers.add_header("Pragma", "no-cache")
      self.response.out.write(template.render(path, val))

    elif action == 'login':
      url = Flickr.auth_loginUrl('write')
      logging.debug(url)
      self.redirect(url)

    elif action == 'auth':
      frog = self.request.get('frob')
      flickr = None
      if 'flickr' in self.session:
        flickr = self.session['flickr']
      else:
        flickr = Flickr()
        self.session['flickr'] = flickr

      if flickr.auth_getToken(frog):
        self.session.save()
        self.redirect('/flickr/')

    elif action == 'logout':
      if 'flickr' in self.session:
        flickr = self.session['flickr']
        flickr.auth_logout()
        self.session.save()
      self.redirect('/flickr/')

  def post(self, action):
    if action == 'signcall':
      if 'flickr' in self.session:
        req = json.read(self.request.body)
        # TODO check req...
        flickr = self.session['flickr']
        url = flickr.signurl(req, True)
        logging.debug(url)
        self.response.out.write(url)

class GpxUploadHandler(webapp.RequestHandler):
  def getText(self, n):
    rc = ""
    for i in n.childNodes:
      if i.nodeType == n.TEXT_NODE:
        rc = rc + i.data
    return rc

  def parseGPX(self, content):
    gpx = {'wpt':[], 'rte':[], 'trk':[]}
    try:
      dom = minidom.parseString(content)
      wpts = dom.getElementsByTagName('wpt')
      rtes = dom.getElementsByTagName('rte')
      trks = dom.getElementsByTagName('trk')
      if len(wpts) == 0 and len(rtes) == 0 and len(trks) == 0:
        return None
      else:
        for i_wpt in wpts:
          wpt = {'lat':i_wpt.getAttribute('lat'), 'lon':i_wpt.getAttribute('lon')}
          gpx['wpt'].append(wpt)

        for i_rte in rtes:
          rte = {'rtept':[]}
          color = i_rte.getElementsByTagName('topografix:color')
          if len(color) > 0:
            rte['color'] = self.getText(color[0])

          for i_rtept in i_rte.getElementsByTagName('rtept'):
            rtept = {'lat':i_rtept.getAttribute('lat'), 'lon':i_rtept.getAttribute('lon')}
            rte['rtept'].append(rtept)
          gpx['rte'].append(rte)

        for i_trk in trks:
          trk = {'trkseg':[]}
          color = i_trk.getElementsByTagName('topografix:color')
          if len(color) > 0:
            trk['color'] = self.getText(color[0])

          for i_trkseg in i_trk.getElementsByTagName('trkseg'):
            trkseg = {'trkpt':[]}
            for i_trkpt in i_trkseg.getElementsByTagName('trkpt'):
              trkpt = {'lat':i_trkpt.getAttribute('lat'), 'lon':i_trkpt.getAttribute('lon')}
              trkseg['trkpt'].append(trkpt)
            trk['trkseg'].append(trkseg)
          gpx['trk'].append(trk)
    except:
      return None

    return gpx


  def post(self, action):
    rsp = {}
    if action == 'preview':
      fileContent = self.request.get('upload_file_input')
      gpx = self.parseGPX(fileContent)

      if gpx == None:
        rsp['stat'] = 'error'
        rsp['message'] = "Can't parse upload file! Maybe not GPX file or no trk data in file.";
      else:
        rsp['stat'] = 'ok'
        rsp['gpx'] = gpx

    elif action == 'save':
      fileContent = self.request.get('upload_file_input')
      gpx = self.parseGPX(fileContent)

      if gpx == None:
        rsp['stat'] = 'error'
        rsp['message'] = "Can't parse upload file! Maybe not GPX file or no trk data in file.";
      else:
        rsp['stat'] = 'ok'
        rsp['gpx'] = gpx
        # TODO save it
    else:
      return None

    cb = self.request.get('cb');
    self.response.out.write('<script type="text/javascript">'+cb+'('+json.write(rsp)+')</script>')


class FlickrPhotoSetHandler(webapp.RequestHandler):
  def get(self, params):
    if params == '':
      return

    p = re.compile('/')
    params = p.sub( ',', params)
    
    val = {'API_KEY':Flickr.API_KEY, 'fsetids':params}
    path = os.path.join(os.path.dirname(__file__), 'show.html')
    self.response.headers.add_header("Expires", "Tue, 01 Jan 1980 1:00:00 GMT")
    self.response.headers.add_header("Pragma", "no-cache")
    self.response.out.write(template.render(path, val))

class ShowHandler(webapp.RequestHandler):
  def get(self):
    fsetids = self.request.get('fset')
    gpxids = self.request.get('gpx')
    if fsetids == '' and gpxids == '':
      return
    val = {'API_KEY':Flickr.API_KEY, 'fsetids':fsetids, 'gpxids':gpxids}
    path = os.path.join(os.path.dirname(__file__), 'show.html')
    self.response.headers.add_header("Expires", "Tue, 01 Jan 1980 1:00:00 GMT")
    self.response.headers.add_header("Pragma", "no-cache")
    self.response.out.write(template.render(path, val))

application = webapp.WSGIApplication([
      ('/', MainPage),
      (r'/flickr/(.*)', FlickrHandler),
      (r'/flickrphotoset/(.*)', FlickrPhotoSetHandler),
      (r'/show', ShowHandler),
      (r'/gpxupload/(.*)', GpxUploadHandler),
    ],
    debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()

