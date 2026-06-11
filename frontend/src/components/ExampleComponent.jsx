import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useData } from '../DataContext';
import { API_BASE_URL } from '../config';

const ExampleComponent = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { map, fetchedRecords, setFetchedRecords, forenseRecords, markers, forenseMarkers, heatmapLayer, markerClusterGroup, timelineData, timeline, timelineControl, COLORS } = useData();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/casos`, {
                    headers: {
                        'API_KEY': 'gNXGJ0hCDavnMHvqbVRhL4yZalLUceQ4ccEHQmB40bQ',
                        'Content-Type': 'application/json'
                    },
                    params: {
                        start_date: '2022-01-01',
                        end_date: '2022-12-31'
                    }
                });

                const records = response.data.records || [];

                const fetchedRecords = records.map((record) => {
                    const [lat, lon] = record.lat_long ? record.lat_long.split(',').map(coord => parseFloat(coord)) : [null, null];
                    console.log(`Fetched record ID: ${record.id_cedula_busqueda}, Lat: ${lat}, Lon: ${lon}`);
                    return {
                        ...record,
                        lat,
                        lon,
                        id: record.id_cedula_busqueda,
                        fecha_desaparicion: record.fecha_desaparicion,
                        sexo: record.sexo,
                        edad_momento_desaparicion: record.edad_momento_desaparicion,
                        condicion_localizacion: record.condicion_localizacion,
                        descripcion_desaparicion: record.descripcion_desaparicion,
                        tipo_marcador: 'cedula_busqueda'
                    };
                });

                // Update the context with the fetched records
                setFetchedRecords(fetchedRecords);

                setData(fetchedRecords);
                setLoading(false);
            } catch (error) {
                setError(error);
                setLoading(false);
            }
        };

        fetchData();
    }, [setFetchedRecords]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;

    console.log('Fetched Data:', data);
    console.log('Map instance:', map);
    console.log('Fetched Records:', fetchedRecords);
    console.log('Forense Records:', forenseRecords);
    console.log('Markers:', markers);
    console.log('Forense Markers:', forenseMarkers);
    console.log('Heatmap Layer:', heatmapLayer);
    console.log('Marker Cluster Group:', markerClusterGroup);
    console.log('Timeline Data:', timelineData);
    console.log('Timeline:', timeline);
    console.log('Timeline Control:', timelineControl);
    console.log('Marker Colors:', COLORS);

    return (
        <div>
            <h1>Fetched Data</h1>
            {/* Example usage of context variables */}
            <p>Map instance: {map ? 'Initialized' : 'Not initialized'}</p>
            <p>Fetched Records: {fetchedRecords.length}</p>
            <p>Forense Records: {forenseRecords.length}</p>
            <p>Markers: {markers.length}</p>
            <p>Forense Markers: {forenseMarkers.length}</p>
            <p>Heatmap Layer: {heatmapLayer ? 'Initialized' : 'Not initialized'}</p>
            <p>Marker Cluster Group: {markerClusterGroup ? 'Initialized' : 'Not initialized'}</p>
            <p>Timeline Data: {timelineData ? 'Available' : 'Not available'}</p>
            <p>Timeline: {timeline ? 'Initialized' : 'Not initialized'}</p>
            <p>Timeline Control: {timelineControl ? 'Initialized' : 'Not initialized'}</p>
            <p>Marker Colors: {JSON.stringify(COLORS)}</p>
        </div>
    );
};

export default ExampleComponent;
