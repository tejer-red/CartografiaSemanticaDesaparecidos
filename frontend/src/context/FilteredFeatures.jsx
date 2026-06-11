const getFilteredFeatures = (map, selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange) => {
    if (!map || !selectedDate) return [];
  
    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);
    endDate.setDate(endDate.getDate() + daysRange);
  
    const selectedTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
  
    const attributeFilters = [];
    if (selectedSexo.length > 0) {
      attributeFilters.push(['in', ['get', 'sexo'], ['literal', selectedSexo]]);
    }
    if (selectedCondicion.length > 0) {
      attributeFilters.push(['in', ['get', 'condicion_localizacion'], ['literal', selectedCondicion]]);
    }
    attributeFilters.push([">=", ["to-number", ["get", "edad_momento_desaparicion"]], edadRange[0]]);
    attributeFilters.push(["<=", ["to-number", ["get", "edad_momento_desaparicion"]], edadRange[1]]);
    attributeFilters.push([">=", ["to-number", ["get", "sum_score"]], sumScoreRange[0]]);
    attributeFilters.push(["<=", ["to-number", ["get", "sum_score"]], sumScoreRange[1]]);
  
    const dateFilters = [
      [">=", ["to-number", ["get", "timestamp"]], selectedTimestamp],
      ["<=", ["to-number", ["get", "timestamp"]], endTimestamp]
    ];
  
    const combinedFilter = ['all', ...attributeFilters, ...dateFilters];
  
    console.log('Combined Filter:', combinedFilter);
  
    // Query the features from the map using the combined filter
    const filteredFeatures = map.querySourceFeatures('cedulaLayer', {
      filter: combinedFilter
    });
  
    console.log('Filtered Features:', filteredFeatures);
  
    return filteredFeatures;
  };
  
  export default getFilteredFeatures;