function DriverList({ drivers }) {    
    return (
       <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>License Number</th>
                    </tr>
                </thead>
                <tbody>
                    {drivers.map((driver) => (
                        <tr key={driver.id}>
                            <td>{driver.name}</td>
                            <td>{driver.phone}</td>
                            <td>{driver.email}</td>
                            <td>{driver.license_number}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
       </div> 
    )
}

export default DriverList;