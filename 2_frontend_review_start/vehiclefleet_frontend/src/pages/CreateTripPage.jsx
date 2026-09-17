import TripForm from "../components/TripForm";
import { DRIVERS, VEHICLES } from "../mockData"
import { useNavigate } from "react-router-dom";

function CreateTripPage() {
    const navigate = useNavigate();
  
    function handleSubmit(formData) {
        console.log('THIS IS FORM DATA FOR A NEW TRIP', formData)
        navigate('/trips')
    }
    
    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">
                Create a New Trip
            </h2>
            <TripForm drivers={DRIVERS} vehicles={VEHICLES} onSubmit={handleSubmit}/>
        </div>
    )
}

export default CreateTripPage;