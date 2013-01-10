#!/bin/sh

echo Read API Key
read apikey
echo Read API Secret
read secret

cp web/main.py /tmp/main.py
sed -e "s/bde30c9a6b136fee3e6f7b9b6fa0117c/$apikey/" -e "s/7fbfea9ba5a11e5f/$secret/" /tmp/main.py > web/main.py
appcfg.py update .
mv /tmp/main.py web/main.py


