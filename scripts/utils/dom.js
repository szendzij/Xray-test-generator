// scripts/utils/dom.js

/**
 * A utility class for selecting DOM elements.
 */
export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

/**
 * Shows a DOM element.
 * @param {HTMLElement} element - The element to show.
 */
export function show(element) {
    if (element) {
        element.classList.remove('hidden');
    }
}

/**
 * Hides a DOM element.
 * @param {HTMLElement} element - The element to hide.
 */
export function hide(element) {
    if (element) {
        element.classList.add('hidden');
    }
}

/**
 * Sets the text content of a DOM element.
 * @param {HTMLElement} element - The element to update.
 * @param {string} text - The text to set.
 */
export function setText(element, text) {
    if (element) {
        element.textContent = text;
    }
}

/**
 * Disables a DOM element.
 * @param {HTMLElement} element - The element to disable.
 */
export function disable(element) {
    if (element) {
        element.disabled = true;
    }
}

/**
 * Enables a DOM element.
 * @param {HTMLElement} element - The element to enable.
 */
export function enable(element) {
    if (element) {
        element.disabled = false;
    }
}