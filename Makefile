all:
ifdef OS
	sed -e "s/\/scripts\/flickr-maps.js/\/scripts\/flickr-maps.js?_=%random%/" flickr.html > web/flickr.html
	sed -e "s/\/scripts\/flickr-maps.js/\/scripts\/flickr-maps.js?_=%random%/" show.html > web/show.html
else
	sed -e "s/\/scripts\/flickr-maps.js/\/scripts\/flickr-maps.js?_=`date +%N`/" flickr.html > web/flickr.html
	sed -e "s/\/scripts\/flickr-maps.js/\/scripts\/flickr-maps.js?_=`date +%N`/" show.html > web/show.html
endif
	cp *.py web
	java -jar yuicompressor-2.4.2.jar flickr-maps-uncompress.js -o web/scripts/flickr-maps.js

install: all
	./install.sh
