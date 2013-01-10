all:
ifdef OS
	sed -e "s/\/scripts\/flickr-maps.js/\/scripts\/flickr-maps.js?_=%random%/" flickr.html > gae/flickr.html
	sed -e "s/\/scripts\/flickr-maps.js/\/scripts\/flickr-maps.js?_=%random%/" show.html > gae/show.html
else
	sed -e "s/\/scripts\/flickr-maps.js/\/scripts\/flickr-maps.js?_=`date +%N`/" flickr.html > gae/flickr.html
	sed -e "s/\/scripts\/flickr-maps.js/\/scripts\/flickr-maps.js?_=`date +%N`/" show.html > gae/show.html
endif
	java -jar yuicompressor-2.4.2.jar flickr-maps-uncompress.js -o gae/scripts/flickr-maps.js

