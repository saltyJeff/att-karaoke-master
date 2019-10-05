import { observable } from 'mobx'
import Peer from 'peerjs';
import Pouch from 'pouchdb'

export interface User {
	name: string
	ratingAudience: number
	ratingWatson: number
}

export interface CouchData {
	leftUser: User
	rightUser: User
	songName: string
	karaokeUrl: string
}
declare var WebAudioRecorder
const context = new AudioContext()
const merger = context.createChannelMerger()
const audioRecorder = new WebAudioRecorder(merger, {})
const pouch = new Pouch('pouchity pouch pouch')

audioRecorder.onComplete = function(recorder, blob) {
	console.log('uploading blob')
	fetch(`https://example.com/upload.php`, {method:"POST", body: blob})
		.then(console.log)
}

class AppStore {
	@observable numPeers = 0
	@observable couchData: CouchData = {
		leftUser: {
			name: '?',
			ratingAudience: 0,
			ratingWatson: 0
		},
		rightUser: {
			name: '?',
			ratingAudience: 0,
			ratingWatson: 0
		},
		songName: '?',
		karaokeUrl: '?'
	}
	audioStream: MediaStream = new MediaStream()
	peer: Peer = new Peer('imdacaptainnow')
	constructor () {
		this.peer.on('connection', (conn) => {
			this.numPeers++
			
			if(this.numPeers > 2) {
				alert('too many peers connected :(')
				return
			}

			// wait for a call
			this.peer.on('call', (mediaConn) => {
				mediaConn.answer()
				mediaConn.on('stream', (stream) => {
					const source = context.createMediaStreamSource(stream)
					const splitter = context.createChannelSplitter()
					
					source.connect(splitter)
					splitter.connect(merger, 0, this.numPeers - 1)
					if(this.numPeers == 2) {
						if(audioRecorder.isRecording()) {
							console.log('cancelled recording')
							audioRecorder.cancelRecording()
						}
						console.log('recording')
						audioRecorder.startRecording()
					}
				})
			})
		})
		this.peer.on('disconnected', () => {
			this.numPeers--
			console.log('cancelled recording')
			audioRecorder.cancelRecording()
		})
		pouch.get('game').then((doc) => {
			this.couchData = doc as any
		})
		pouch.changes().on('change', () => {
			pouch.get('game').then((doc) => {
				this.couchData = doc as any
			})
		})
		merger.connect(context.destination)
	}
}

export const store = new AppStore()
;(window as any).store = store