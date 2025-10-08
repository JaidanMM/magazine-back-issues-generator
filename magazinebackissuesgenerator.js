// ==UserScript==
// @name         Magazine Back Issue Generator
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Extract publication IDs and months, generate CSV, and name the file in "Month Year - Back Issues CSV.csv" format
// @match        https://www.magmanager.co.uk/Forms
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Category mapping
    const categoryMapping = {
        'Andover Gazette': 'andover-gazette-back-issues',
        'Lyndhurst Gazette': 'the-lyndhurst-directory-back-issues',
        'Brockenhurst Gazette': 'the-brockenhurst-guide-back-issues',
        'Forest Edge Gazette': 'forest-edge-gazette-back-issues',
        'Ringwood Gazette': 'roundabout-ringwood-back-issues',
        'Romsey & Wellow Gazette': 'romsey-&-wellow-gazette-back-issues',
        'The Verwood Directory': 'roundabout-verwood-back-issues',
        'Test Valley Gazette': 'test-valley-gazette-back-issues',
        'The Blandford and Villages Directory': 'roundabout-east-dorset-villages-back-issues',
        'The Bournemouth Directory': 'the-bournemouth-directory-back-issues',
        'The Christchurch Directory': 'the-christchurch-directory-back-issues',
        'The Dorchester Directory': 'the-dorchester-directory-back-issues',
        'The Ferndown & West Parley Directory': 'ferndown-and-west-parley-back-issues',
        'The Poole Directory': 'the-poole-directory-back-issues',
        'The Southbourne Link': 'the-southbourne-link-back-issues',
        'The St Leonards & St Ives Directory': 'the-st-leonards-&-st-ives-directory-back-issues',
        'The Swanage Oracle': 'the-swanage-oracle-back-issues',
        'The Wareham District Directory': 'the-wareham-directory-back-issues',
        'The West Moors Directory': 'the-west-moors-directory-back-issues',
        'The Wimborne Directory': 'the-wimborne-directory-back-issues',
        'Winchester Gazette': 'winchester-gazette-back-issues',
        'Wonderful Weymouth': 'wonderful-weymouth-back-issues'
    };

    // Month mapping: Abbreviation to full name
    const monthMapping = {
        "Jan": "January",
        "Feb": "February",
        "Mar": "March",
        "Apr": "April",
        "May": "May",
        "Jun": "June",
        "Jul": "July",
        "Aug": "August",
        "Sep": "September",
        "Oct": "October",
        "Nov": "November",
        "Dec": "December"
    };

    // Expand abbreviated month names to full names
    function expandMonth(monthStr) {
        let parts = monthStr.split(" ");
        if (parts.length > 0) {
            let potentialAbbr = parts[0].trim();
            // Only expand if exactly three letters (covers e.g. "Jan", "Feb", etc.)
            if (potentialAbbr.length === 3 && monthMapping[potentialAbbr]) {
                parts[0] = monthMapping[potentialAbbr];
            }
        }
        return parts.join(" ");
    }

    // Normalize a raw month string (including slash cases) into "FullMonth Year"
    function normalizeMonth(rawMonth) {
        rawMonth = rawMonth.trim();

        // If there's a slash, take the first portion and any 4-digit year
        if (rawMonth.includes('/')) {
            let parts = rawMonth.split('/');
            let firstPart = parts[0].trim();
            // Expand to full month name if abbreviated
            if (firstPart.length === 3 && monthMapping[firstPart]) {
                firstPart = monthMapping[firstPart];
            }
            // Extract the 4-digit year
            let yearMatch = rawMonth.match(/\d{4}/);
            return yearMatch ? `${firstPart} ${yearMatch[0]}` : firstPart;
        } else {
            // For single-month strings, expand if abbreviated
            return expandMonth(rawMonth);
        }
    }

    // Extract publication IDs, generate CSV, and download
    function extractData() {
        let rows = document.querySelectorAll('#forms tbody tr');
        if (!rows.length) {
            alert('No rows found!');
            return;
        }

        // Get the month from the FIRST row to build the CSV filename
        let firstRowMonthRaw = rows[0].querySelector('td:nth-child(3)').textContent;
        let firstRowMonthNormalized = normalizeMonth(firstRowMonthRaw);
        // If no year is found in the first row, you can default to something
        if (!/\d{4}/.test(firstRowMonthNormalized)) {
            firstRowMonthNormalized += ' (NoYear)';
        }

        // Prepare CSV content
        let csvContent = 'id,post_title,post_content,post_category,post_date\n';

        rows.forEach(row => {
            let id = row.getAttribute('data-version-id');
            let rawMonth = row.querySelector('td:nth-child(3)').textContent;
            let month = normalizeMonth(rawMonth);

            let publicationName = row.querySelector('td:nth-child(2)').textContent.trim();
            let postTitle = month;
            let postContent = `<div id="digi${id}" style="background-position: center; height: 400px; background-image: url(https://magmanagerpublic.s3-eu-west-1.amazonaws.com/1519/${id}/pages/1.jpg); background-size: contain; cursor: pointer; background-repeat: no-repeat;" onclick="window.open('https://digital.magmgr.com/Preview/Index/${id}')"></div>`;
            let postCategory = categoryMapping[publicationName] || 'default-category';
            let postDate = month;

            csvContent += `${id},${postTitle},${postContent},${postCategory},${postDate}\n`;
        });

        // Final file name: "Month Year - Back Issues CSV.csv"
        let fileName = `${firstRowMonthNormalized} - Back Issues CSV.csv`;
        downloadCSV(csvContent, fileName);
    }

    // Trigger CSV download
    function downloadCSV(content, fileName) {
        let blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Create a link styled like the "New Issue" button
    let extractButton = document.createElement('a');
    extractButton.textContent = 'Download Back Issues CSV';
    extractButton.href = 'javascript:void(0);';
    // Use the same base classes
    extractButton.className = 'btn btn-success menu-btn';
    extractButton.style.marginRight = '10px';

    // On click, run extraction
    extractButton.addEventListener('click', extractData);

    // Insert the new button to the LEFT of the existing "New Issue" button
    const newIssueBtn = document.querySelector('.magazine-area a.btn.btn-success.menu-btn.btn-inline-right-table');
    if (newIssueBtn) {
        // Put our button before the "New Issue" button
        newIssueBtn.insertAdjacentElement('beforebegin', extractButton);
    } else {
        // Fallback: if we can't find the "New Issue" button, just append to .magazine-area
        let container = document.querySelector('.magazine-area');
        if (container) {
            container.appendChild(extractButton);
        }
    }
})();
