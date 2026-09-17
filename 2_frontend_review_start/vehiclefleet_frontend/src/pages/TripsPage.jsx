import { useState, useEffect } from 'react';
import TripList from '../components/TripList';
import { TRIPS } from '../mockData'

const TRIP_INIT_STATE = {
    trips: [],
    loading: true,
}

function TripsPage() {
    const [state, setState] = useState(TRIP_INIT_STATE);

    useEffect(() => {
        function mockFetch(value) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(value);
                }, 3000);
            })
        }

        mockFetch(TRIPS)
            .then((result) => {
                setState((prevState) => ({
                    ...prevState, trips: result
                }));
            })
            .catch((err) => {
                console.error(err);
            })
            .finally(() => {
                setState((prevState) => ({
                    ...prevState, loading: false
                }));
            })
    }, [TRIPS]);

    return (
        
        <div className="flex flex-col gap-8">
            <section>
                <h2 className="text-xl font-semibold mb-3">
                    Trips
                </h2>
                {state.loading ? (
                    <span className="loading loading-spinner loading-lg" />
                ) : (
                   <TripList trips={state.trips} /> 
                )}
                
                
            </section>
        </div>
    )
}

export default TripsPage;