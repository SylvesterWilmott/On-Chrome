'use strict'

/* global chrome */

import * as storage from './storage.js'
import * as i18n from './localize.js'
import * as tabs from './tabs.js'

document.addEventListener('DOMContentLoaded', init)

async function init () {
  try {
    await restorePreferences()
  } catch (error) {
    console.error('An error occurred:', error)
  }

  registerListeners()
  i18n.localize()
  setupDocument()
}

function setupDocument () {
  const animatedElements = document.querySelectorAll('.no-transition')

  for (const el of animatedElements) {
    const pseudoBefore = window.getComputedStyle(el, ':before').content
    const pseudoAfter = window.getComputedStyle(el, ':after').content
    const hasBeforeContent = pseudoBefore !== 'none' && pseudoBefore !== ''
    const hasAfterContent = pseudoAfter !== 'none' && pseudoAfter !== ''

    if (hasBeforeContent || hasAfterContent) {
      el.addEventListener(
        'transitionend',
        function () {
          el.classList.remove('no-transition')
        },
        { once: true }
      )
    }

    el.classList.remove('no-transition')
  }

  document.body.classList.remove('hidden')
}

function registerListeners () {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]')

  for (const checkbox of checkboxes) {
    checkbox.addEventListener('change', onCheckBoxChanged)
  }

  const buttons = document.querySelectorAll('button')

  for (const button of buttons) {
    button.addEventListener('click', onButtonClicked)
  }
}

async function restorePreferences () {
  const storedPreferences = await storage
    .load('preferences', storage.preferenceDefaults)
    .catch((error) => {
      console.error('An error occurred:', error)
    })

  for (const preferenceName in storedPreferences) {
    const preferenceObj = storedPreferences[preferenceName]
    const preferenceElement = document.getElementById(preferenceName)

    if (preferenceElement) {
      preferenceElement.checked = preferenceObj.status
    }
  }
}

async function onCheckBoxChanged (e) {
  const target = e.target
  const targetId = target.id

  const storedPreferences = await storage
    .load('preferences', storage.preferenceDefaults)
    .catch((error) => {
      console.error('An error occurred:', error)
      target.checked = !target.checked
    })

  const preference = storedPreferences[targetId]

  if (!preference) return

  if (preference.permissions !== null) {
    if (preference.permissions.includes('downloads')) {
      if (target.checked) {
        chrome.permissions.request(
          {
            permissions: ['downloads']
          },
          (granted) => {
            if (chrome.runtime.lastError) {
              console.log(chrome.runtime.lastError.message)
            }

            if (!granted) {
              target.checked = !target.checked
            }
          }
        )
      } else {
        chrome.permissions.remove(
          {
            permissions: ['downloads']
          },
          (removed) => {
            if (chrome.runtime.lastError) {
              console.log(chrome.runtime.lastError.message)
            }
          }
        )
      }
    }
  }

  preference.status = target.checked

  try {
    await storage.save('preferences', storedPreferences)
  } catch (error) {
    console.error('An error occurred:', error)
    target.checked = !target.checked
  }
}

async function onButtonClicked (e) {
  const target = e.target
  const targetId = target.id

  if (targetId === 'rate') {
    let url = `https://chrome.google.com/webstore/detail/${chrome.runtime.id}/reviews`

    try {
      await tabs.create(url)
    } catch (error) {
      console.error('An error occurred:', error)
    }
  }
}