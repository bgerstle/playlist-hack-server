import os
from flask import Flask, url_for, redirect
import pdb

app = Flask(__name__)

@app.route('/', defaults={'file': 'index.html'})
@app.route('/<path:file>')
def reroute_to_static(file):
  return redirect(url_for('static', filename=file))

if __name__ == '__main__':
  app.run()