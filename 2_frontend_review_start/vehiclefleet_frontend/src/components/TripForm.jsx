import { useState } from 'react'

const EMPTY_FORM = {
    vehicle: '',
    driver: '',
    start_location: '',
    end_location: '',
    start_time: '',
}

function TripForm({ vehicles, drivers, onSubmit }) {
    const [formData, setFormData] = useState(EMPTY_FORM);

    function handleChange(e) {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    function handleSubmit(e) {
        e.preventDefault();
        onSubmit(formData);
        setFormData(EMPTY_FORM);
    }
    
    return (
        <div className="card bg-base-100 shadow-md w-full max-w-xl">
            <div className="card-body gap-5">
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <label className="form-control w-full">
                        <div className="label pb-1">
                            <span className="label-text font-medium">Vehicle</span>
                        </div>
                        <select className="select select-bordered w-full" name="vehicle" value={formData.vehicle} onChange={handleChange}>
                            <option value="" disabled>
                                Select a Vehicle
                            </option>
                            {vehicles.map((v) => (
                                <option value={v.id} key={v.id}>
                                    {v.make} {v.model} - {v.license_plate} 
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="form-control w-full">
                        <div className="label pb-1">
                            <span className="label-text font-medium">Driver</span>
                        </div>
                        <select className="select select-bordered w-full" name="driver" value={formData.driver} onChange={handleChange}>
                            <option value="" disabled>
                                Select a Driver
                            </option>
                            {drivers.map((d) => (
                                <option value={d.id} key={d.id}>
                                    {d.name} - {d.phone} ({d.email}) 
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="form-control w-full">
                        <div className="label pb-1">
                            <span className="label-text font-medium">Start Location</span>
                        </div>
                        <input className="input w-full" type="text" name="start_location" value={formData.start_location} onChange={handleChange} />
                    </label>

                    <label className="form-control w-full">
                        <div className="label pb-1">
                            <span className="label-text font-medium">End Location</span>
                        </div>
                        <input className="input w-full" type="text" name="end_location" value={formData.end_location} onChange={handleChange} />
                    </label>

                    <label className="form-control w-full">
                        <div className="label pb-1">
                            <span className="label-text font-medium">Start Time</span>
                        </div>
                        <input className="input w-full" type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} />
                    </label>

                    <div className="card-actions justify-end pt-2">
                        <button type="submit" className="btn btn-primary">Create Trip</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default TripForm;