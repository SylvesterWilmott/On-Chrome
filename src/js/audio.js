'use strict'

/* global chrome */
/* global Audio */

chrome.runtime.onMessage.addListener(onMessageReceived)

function onMessageReceived (message, sender, sendResponse) {
  if (message.msg === 'play_sound') {
    switch (message.sound) {
      case 'beep':
        playSound('beep')
        break
      case 'click':
        playSound('click')
        break
    }
  }

  sendResponse()
}

function playSound (sound) {
  let playable

  switch (sound) {
    case 'beep':
      playable = new Audio('./audio/beep.mp3')
      break
    case 'click':
      playable = new Audio('./audio/click.mp3')
      break
  }

  playable.play()
}
