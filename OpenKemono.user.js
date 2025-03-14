// ==UserScript==
// @name         OpenKemono
// @author       Nox
// @version      2.3
// @homepage     https://github.com/NoxNecro/OpenKemono
// @supporturl   https://github.com/NoxNecro/OpenKemono/issues
// @description  Adds a button to Patreon, Pixiv Fanbox, Pixiv, Fantia, Subscribestar, Boosty and Gumroad that opens its respective Kemono user page. Also shows whether a user has a kemono page using colors.
// @match        *://www.patreon.com/*
// @match        *://*.fanbox.cc/*
// @match        *://www.pixiv.net/en/users/*
// @match        *://fantia.jp/fanclubs/*
// @match        *://subscribestar.adult/*
// @match        *://boosty.to/*
// @match        *://*.gumroad.com/*
// @match        *://gumroad.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function getSiteType() {
        let hostname = window.location.hostname;
        if (hostname.includes("patreon.com")) return "patreon";
        if (hostname.includes("fanbox.cc")) return "fanbox";
        if (hostname.includes("pixiv.net")) return "pixiv";
        if (hostname.includes("fantia.jp")) return "fantia";
        if (hostname.includes("subscribestar.adult")) return "subscribestar";
        if (hostname.includes("boosty.to")) return "boosty";
        if (hostname.includes("gumroad.com")) return "gumroad";

        return null;
    }

    function extractCreatorID() {
        let siteType = getSiteType();
        let creatorID = null;

        if (siteType === "patreon") {
            let scripts = document.querySelectorAll('script');
            for (let script of scripts) {
                let match = script.textContent.match(/"creator"\s*:\s*{\s*"data"\s*:\s*{\s*"id"\s*:\s*"(\d+)"/);
                if (match) {
                    creatorID = match[1];
                    break;
                }
            }
        } else if (siteType === "fanbox") {
            // Listen for network requests to the Fanbox API to capture the creator ID
            let originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                if (url.includes('print/sharpContentInstance.list')) {
                    // Extract the userId from the URL
                    let match = url.match(/userId=(\d+)/);
                    if (match) {
                        creatorID = match[1];
                        console.log(`Detected Fanbox creator ID: ${creatorID}`);

                        // Now that we have the creator ID, add the button
                        addKemonoButton(creatorID, siteType);
                    }
                }
                return originalOpen.apply(this, arguments);
            };
        } else if (siteType === "pixiv") {
            let match = window.location.pathname.match(/\/users\/(\d+)/);
            if (match) {
                creatorID = match[1];
            }
        } else if (siteType === "fantia") {
            let match = window.location.pathname.match(/\/fanclubs\/(\d+)/);
            if (match) {
                creatorID = match[1];
            }
        } else if (siteType === "subscribestar") {
            let match = window.location.pathname.match(/\/([^\/]+)/);
            if (match) {
                creatorID = match[1];
            }
        } else if (siteType === "boosty") {
            let match = window.location.pathname.match(/\/([^\/]+)/);
            if (match) {
                creatorID = match[1];
            }
        } else if (siteType === "gumroad") {
            let match = document.body.innerHTML.match(/"external_id":"(\d+)"/);
            if (match) {
                creatorID = match[1];
            }
        }

        // If we don't find the creator ID from the API or other methods, just show the message
        if (creatorID) {
            addKemonoButton(creatorID, siteType);
        } else {
            console.warn("Could not extract creator ID");
        }
    }

    function addKemonoButton(creatorID, siteType) {
        // Prevent duplicate button
        if (document.getElementById("kemonoButton")) return;

        let kemonoURL;

        // Handle the Pixiv case separately to avoid using the wrong URL structure
        if (siteType === "pixiv") {
            kemonoURL = `https://kemono.su/fanbox/user/${creatorID}`; // Use the Fanbox URL format for Pixiv
        } else {
            kemonoURL = `https://kemono.su/${siteType}/user/${creatorID}`; // Use the site-specific URL for Patreon and Fanbox
        }

        function checkKemonoPage(creatorID, button) {
            let corsProxy;

            // Check if the site is Pixiv
            if (siteType === "pixiv") {
                corsProxy = `https://corsproxy.io/?url=https://kemono.su/api/v1/fanbox/user/${creatorID}/profile`;
            } else {
                corsProxy = `https://corsproxy.io/?url=https://kemono.su/api/v1/${siteType}/user/${creatorID}/profile`;
            }

            fetch(corsProxy)
                .then(response => response.json())
                .then(data => {
                    if (data && data.id) { // Check if the "id" field exists
                        console.log(`Kemono page exists for creator ID ${creatorID}`);
                        button.style.backgroundColor = "green"; // Change button color to green
                    } else {
                        console.log(`Kemono page NOT found for creator ID ${creatorID}`);
                        button.style.backgroundColor = "red"; // Change button color to red
                    }
                })
                .catch(error => {
                    console.error("Error checking Kemono:", error);
                    button.style.backgroundColor = "purple"; // Default to purple on error
                });
        }

        let button = document.createElement("button");
        button.id = "kemonoButton";
        button.innerText = "Open in Kemono";
        button.style.position = "fixed";
        button.style.bottom = "20px";
        button.style.right = "20px";
        button.style.zIndex = "9999";
        button.style.color = "white";
        button.style.border = "none";
        button.style.padding = "10px 15px";
        button.style.fontSize = "14px";
        button.style.cursor = "pointer";
        button.style.borderRadius = "5px";
        button.style.backgroundColor = "#555";

        // Default color while checking
        button.style.backgroundColor = "#555";

        button.onclick = function() {
            window.open(kemonoURL, "_blank");
        };

        document.body.appendChild(button);

        // Check if the Kemono page exists and update button color
        checkKemonoPage(creatorID, button);
    }

    window.addEventListener('load', extractCreatorID);
})();
