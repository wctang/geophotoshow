
import os
import time
import random
import sha
import Cookie

from google.appengine.api import memcache


COOKIE_NAME = 'SID'
COOKIE_PATH = '/'
EXPIRE_TIME = 3600 # (1 hours)


class Session(object):
  def __init__(self, cookie_path=COOKIE_PATH, expire_time=EXPIRE_TIME, cookie_name=COOKIE_NAME):
    self.cookie_path = cookie_path
    self.expire_time = expire_time
    self.cookie_name = cookie_name

    self.cookie = Cookie.SimpleCookie()
    string_cookie = os.environ.get('HTTP_COOKIE','')

    self.cookie.load(string_cookie)
    if self.cookie.get(cookie_name):
      self.sid = self.cookie[cookie_name].value
    else:
      self.sid = self.__new_sid()

    self.session = self.__get_session(self.sid)
    if not self.session:
      self.session = {}

  def save(self):
    self.__set_session()
    self.cookie[self.cookie_name] = self.sid	
    self.cookie[self.cookie_name]['path'] = self.cookie_path
    self.cookie[self.cookie_name]['expires'] = self.expire_time
    print self.cookie[self.cookie_name]

  def __new_sid(self):
    sid = sha.new(repr(time.time()) + os.environ['REMOTE_ADDR'] + str(random.random())).hexdigest()
    return sid

  def __get_session(self, sid):
    return memcache.get('sid-' + sid)
  def __set_session(self):
    memcache.set('sid-'+self.sid, self.session, self.expire_time)

  def __contains__(self, keyname):
    try:
      r = self.__getitem__(keyname)
    except KeyError:
	  return False
    return True

  def __getitem__(self, keyname):
    return self.session[keyname]

  def __setitem__(self, keyname, value):
    self.session[keyname] = value
    self.__set_session();
