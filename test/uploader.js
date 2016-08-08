import ChunkedUploader from 'services/ChunkedUploader'
import shortid from 'shortid'
import cloudinary from 'cloudinary_js'
import {API_KEY} from '../../../secrets.js'


function fileChanged(el) {
  const file = el.target.files[0];
  const uploader = new ChunkedUploader(file, {
    url: 'https://api.cloudinary.com/v1_1/he97djkap/upload',
    params: {
      'api_key':       API_KEY,
      'timestamp':     Date.now / 1000 | 0,
      'upload_preset': 'video_async',
      'public_id':       shortid.generate(),
    }
  })
  uploader.start().then(()=>{
    console.log('success')
  }).catch((err)=>{
    console.log('error', err)
  })
  uploader.on('error', (err)=>{
    console.log(err)
  })
  uploader.on('progress', (evt)=>{
    console.log(evt)
  })
}

const container = document.createElement('<div>')
document.appendChild(container)
const input = document.createElement('input')
input.setAttribute('name', 'uploadFile')
input.setattribute('type', 'file')
input.setattribute('accept', 'video/*')
input.addeventlistener('onchange', filechanged)
