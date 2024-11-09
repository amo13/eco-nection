mapboxgl.accessToken = 'pk.eyJ1IjoicGVpc2thc3NpbyIsImEiOiJjbTM4eHB5NHIwd2M5MmlxeGlsOTRqams5In0.hEmqLEzaR2kWC2s7Hgd-Ng';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v10',
    center: [0, 0],
    zoom: 1.5,
    projection: 'globe'
});

map.on('style.load', () => {
    map.setFog({
        'range': [0.5, 10],
        'color': 'rgb(186, 210, 235)',
        'horizon-blend': 0.1
    });
});

map.on('load', async () => {
    const response = await fetch('artwork-data.json');
    const data = await response.json();

    // Add source with loaded data
    map.addSource('artworks', {
        type: 'geojson',
        data: data,
        cluster: true,
        clusterMaxZoom: 10,
        clusterRadius: 20
    });

    // Populate unique tags for topics and artforms
    const topics = new Set();
    const artforms = new Set();

    data.features.forEach(feature => {
        if (feature.properties.tags) {
            if (feature.properties.tags.topic) {
                feature.properties.tags.topic.forEach(tag => topics.add(tag));
            }
            if (feature.properties.tags.artform) {
                feature.properties.tags.artform.forEach(tag => artforms.add(tag));
            }
        }
    });

    // Fill the Topic filter dropdown
    const topicSelect = document.getElementById('tag-filter');
    topics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic;
        option.textContent = topic;
        topicSelect.appendChild(option);
    });

    // Fill the Artform filter dropdown
    const artformSelect = document.getElementById('artform-filter');
    artforms.forEach(artform => {
        const option = document.createElement('option');
        option.value = artform;
        option.textContent = artform;
        artformSelect.appendChild(option);
    });

    // Add cluster and unclustered layers
    map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'artworks',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': '#51bbd6',
            'circle-radius': [
                'step',
                ['get', 'point_count'],
                20, 10,
                30, 20,
                40, 30
            ],
            'circle-opacity': 0.6
        }
    });

    map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'artworks',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
        },
        paint: {
            'text-color': '#ffffff'
        }
    });

    map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'artworks',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': '#f28cb1',
            'circle-radius': 10,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
        }
    });

    map.on('click', 'unclustered-point', (e) => {
    const coordinates = e.features[0].geometry.coordinates.slice();
    const properties = e.features[0].properties || {};

    const title = properties.title || 'Untitled';
    const description = properties.description || 'No Description';
    const artist = properties.artist || 'Unknown';
    const year = properties.year || 'Unknown';

    // Parse tags if it's a JSON string
    let tags = properties.tags;
    if (typeof tags === 'string') {
        try {
            tags = JSON.parse(tags); // Parse stringified JSON
        } catch (error) {
            console.error("Error parsing tags JSON:", error);
            tags = {}; // Default to empty object if parsing fails
        }
    }

    // Access topics and artforms as comma-separated strings
   const popupTopics = Array.isArray(tags.topic) ? tags.topic.join(', ') : 'No Topics';
const popupArtforms = Array.isArray(tags.artform) ? tags.artform.join(', ') : 'No Art Forms';

new mapboxgl.Popup()
    .setLngLat(coordinates)
    .setHTML(`
        <h3>${title}</h3>
        <p><strong>Artist:</strong> ${artist}</p>
        <p><strong>Description:</strong> ${description}</p>
        <p><strong>Year:</strong> ${year}</p>
        <p><strong>Topics:</strong> ${popupTopics}</p>
        <p><strong>Art Forms:</strong> ${popupArtforms}</p>
    `)
    .addTo(map);
    });
});

function applyFilters() {
    const searchText = document.getElementById('search-bar').value.toLowerCase();
    const selectedTopic = document.getElementById('tag-filter').value;
    const selectedArtForm = document.getElementById('artform-filter').value;

    const filter = ['all'];

    // Search filter for title or description
    if (searchText) {
        filter.push([
            'any',
            ['match', ['downcase', ['get', 'title']], [searchText], true, false],
            ['match', ['downcase', ['get', 'description']], [searchText], true, false]
        ]);
    }

    // Topic filter - checking if the selected topic is in tags.topic array
    if (selectedTopic) {
        filter.push(['in', selectedTopic, ['get', 'tags', 'topic']]);
    }

    // Artform filter - checking if the selected artform is in tags.artform array
    if (selectedArtForm) {
        filter.push(['in', selectedArtForm, ['get', 'tags', 'artform']]);
    }

    console.log("Applying filter:", JSON.stringify(filter));

    // Apply filter to the unclustered-point layer to show only matching points
    map.setFilter('unclustered-point', filter.length > 1 ? filter : null);

    // Apply filter to hide clusters when a filter is active
    map.setFilter('clusters', filter.length > 1 ? ['==', 'point_count', 0] : null);
}

document.getElementById('apply-filters').addEventListener('click', applyFilters);

