'use strict';

document.addEventListener('DOMContentLoaded', async function () {
  const container = document.getElementById('versionsContainer');

  try {
    const response = await fetch('versions.json');
    const data = await response.json();

    setTimeout(() => {
      container.innerHTML = ''; // Clear loading message

      data.versions.forEach(version => {
        const box = document.createElement('div');
        box.classList.add('version-box');
        box.id = version;
        box.innerHTML = version.startsWith('v') ? version : 'v' + version;
        box.onclick = () => window.location.href = version;
        container.appendChild(box);
      });

      if (data.versions.length === 0) {
        container.innerHTML = '<p>No documentation versions found.</p>';
      }
    }, 2 * 1000);
  } catch (error) {
    container.innerHTML = '<p>Failed to load versions.</p>';
    console.error('Error fetching versions:', error);
  }
});

