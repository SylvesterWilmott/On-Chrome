'use strict'

/* global chrome */

import * as power from './js/power.js'
import * as storage from './js/storage.js'
import * as offscreen from './js/offscreen.js'
import * as message from './js/message.js'
import * as downloads from './js/downloads.js'

chrome.idle.setDetectionInterval(60)

chrome.runtime.onInstalled.addListener(initializePermissions)
chrome.permissions.onAdded.addListener(initializePermissions)
chrome.permissions.onRemoved.addListener(initializePermissions)
chrome.action.onClicked.addListener(onActionClicked)
chrome.idle.onStateChanged.addListener(onIdleStateChanged)
chrome.storage.onChanged.addListener(onStorageChanged)

async function turnOn () {
  let storedPreferences

  try {
    storedPreferences = await storage.load(
      'preferences',
      storage.preferenceDefaults
    )
  } catch (error) {
    console.error('An error occurred:', error)
    return
  }

  if (storedPreferences.sounds.status === true) playSound('click')

  if (storedPreferences.displaySleep.status === true) {
    power.keepAwake('display')
  } else {
    power.keepAwake('system')
  }

  updateIcon(true)

  try {
    await saveState(true)
  } catch (error) {
    console.error('An error occurred:', error)
  }
}

async function turnOff () {
  let storedPreferences

  try {
    storedPreferences = await storage.load(
      'preferences',
      storage.preferenceDefaults
    )
  } catch (error) {
    console.error('An error occurred:', error)
    return
  }

  if (storedPreferences.sounds.status === true) playSound('beep')

  power.releaseKeepAwake()
  updateIcon(false)

  try {
    await saveState(false)
  } catch (error) {
    console.error('An error occurred:', error)
  }
}

async function onActionClicked () {
  let currentStatus

  try {
    currentStatus = await storage.loadSession('status', false)
  } catch {
    currentStatus = false
  }

  if (currentStatus === true) {
    try {
      await turnOff()
    } catch (error) {
      console.error('An error occurred:', error)
    }
  } else {
    try {
      await turnOn()
    } catch (error) {
      console.error('An error occurred:', error)
    }
  }
}

async function playSound (sound) {
  const documentPath = 'audio-player.html'

  let hasDocument

  try {
    hasDocument = await offscreen.hasDocument(documentPath)
  } catch (error) {
    console.error('An error occurred:', error)
    return
  }

  if (!hasDocument) {
    try {
      await offscreen.create(documentPath)
    } catch (error) {
      console.error('An error occurred:', error)
      return
    }
  }

  message.send({ msg: 'play_sound', sound })
}

async function saveState (state) {
  try {
    await storage.saveSession('status', state)
  } catch (error) {
    console.error('An error occurred:', error)
  }
}

function updateIcon (state) {
  switch (state) {
    case true:
      chrome.action.setIcon({ path: './images/icon32_active.png' })
      break
    case false:
      chrome.action.setIcon({ path: './images/icon32.png' })
      break
  }
}

async function onIdleStateChanged (state) {
  if (state === 'locked') {
    let currentStatus

    try {
      currentStatus = await storage.loadSession('status', false)
    } catch {
      currentStatus = false
    }

    if (currentStatus === true) {
      power.releaseKeepAwake()

      try {
        await saveState(!currentStatus)
      } catch (error) {
        console.error('An error occurred:', error)
      }

      updateIcon(!currentStatus)
    }
  }
}

async function initializePermissions () {
  chrome.permissions.contains(
    {
      permissions: ['downloads']
    },
    (result) => {
      if (result) {
        chrome.downloads.onCreated.addListener(onDownloadCreated)
        chrome.downloads.onChanged.addListener(onDownloadsChanged)
      }
    }
  )
}

async function onDownloadCreated () {
  let currentStatus

  try {
    currentStatus = await storage.loadSession('status', false)
  } catch {
    currentStatus = false
  }

  let storedPreferences

  try {
    storedPreferences = await storage.load(
      'preferences',
      storage.preferenceDefaults
    )
  } catch (error) {
    console.error('An error occurred:', error)
    return
  }

  if (
    currentStatus === false &&
    storedPreferences.autoDownloads.status === true
  ) {
    turnOn()
  }
}

async function onDownloadsChanged () {
  let allDownloads

  try {
    allDownloads = await downloads.search('in_progress')
  } catch (error) {
    console.error('An error occurred:', error)
    return
  }

  let hasInProgressDownloads = false

  for (const download of allDownloads) {
    if (download.state === 'in_progress') {
      hasInProgressDownloads = true
    }
  }

  let storedPreferences

  try {
    storedPreferences = await storage.load(
      'preferences',
      storage.preferenceDefaults
    )
  } catch (error) {
    console.error('An error occurred:', error)
    return
  }

  if (
    !hasInProgressDownloads &&
    storedPreferences.autoDownloads.status === true
  ) {
    turnOff()
  }
}

async function onStorageChanged (changes, areaName) {
  if (areaName !== 'sync' || !changes.preferences) return

  const { oldValue, newValue } = changes.preferences

  if (!oldValue || !newValue || oldValue.displaySleep.status === newValue.displaySleep.status) return

  let currentStatus

  try {
    currentStatus = await storage.loadSession('status', false)
  } catch {
    currentStatus = false
  }

  if (currentStatus !== true) return

  power.releaseKeepAwake()

  if (newValue.displaySleep.status === true) {
    power.keepAwake('display')
  } else {
    power.keepAwake('system')
  }
}
