import React from 'react';
import { useLocation } from 'react-router-dom';
import MapComponent from './MapComponent';

const MainMap = () => {
    const location = useLocation();
    const isVisibleView = location.pathname.includes('/visible/');

    return (
        <div className={`Map ${isVisibleView ? 'visible-view-map' : ''}`}>
            <MapComponent />
        </div>
    );
};

export default MainMap;
