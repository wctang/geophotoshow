#!/bin/sh

echo Read flickr API Key
read apikey
echo Read flickr API Secret
read secret

cp gae/main.py /tmp/main.py
sed -e "s/bde30c9a6b136fee3e6f7b9b6fa0117c/$apikey/" -e "s/7fbfea9ba5a11e5f/$secret/" /tmp/main.py > gae/main.py
appcfg.py update gae
mv /tmp/main.py gae/main.py


