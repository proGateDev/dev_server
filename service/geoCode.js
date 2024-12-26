const axios = require('axios');


const getAddressFromCoordinates = async (latitude, longitude) => {
    const googleMapsPlatformAPIKey = process.env.GOOGLE_MAPS_API_KEY; // Your API key

    // Geocoding URL
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleMapsPlatformAPIKey}`;

    // Places API URL
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=1500&type=tourist_attraction&key=${googleMapsPlatformAPIKey}`;

    try {
        // First, get the address using the Geocoding API
        const geocodeResponse = await axios.get(geocodeUrl);

        if (geocodeResponse.data.status === 'OK') {
            // Extract relevant address components
            const addressComponents = geocodeResponse.data.results[0].address_components;
            const formattedAddress = geocodeResponse.data.results[0].formatted_address;

            // Structure the response to include required fields
            const addressDetails = {
                formattedAddress: formattedAddress,
                locality: 'NOT FOUND', // Default value
                sublocality: 'NOT FOUND', // Default value
                region: 'NOT FOUND', // Default value
                country: 'NOT FOUND', // Default value
                postalCode: 'NOT FOUND', // Default value
                landmarks: [] // Initialize landmarks array
            };

            // Loop through address components to find required fields
            addressComponents.forEach(component => {
                const types = component.types;
                if (types.includes('locality')) {
                    addressDetails.locality = component.long_name;
                }
                if (types.includes('sublocality')) {
                    addressDetails.sublocality = component.long_name;
                }
                if (types.includes('administrative_area_level_1')) {
                    addressDetails.region = component.long_name;
                }
                if (types.includes('country')) {
                    addressDetails.country = component.long_name;
                }
                if (types.includes('postal_code')) {
                    addressDetails.postalCode = component.long_name;
                }
            });

            // Now, get popular landmarks using the Places API
            const placesResponse = await axios.get(placesUrl);
            if (placesResponse.data.status === 'OK') {
                // Extract landmarks information
                addressDetails.landmarks = placesResponse.data.results.map(place => ({
                    name: place.name,
                    vicinity: place.vicinity,
                    location: place.geometry.location
                }));
            }

            return addressDetails;
        } else {
            throw new Error(`Geocoding error: ${geocodeResponse.data.status}`);
        }
    } catch (error) {
        console.error("Error fetching address:", error.message);
        throw new Error('Unable to fetch address');
    }
};


module.exports = getAddressFromCoordinates;
