function DriverList({ drivers }) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>License Number</th>
            <th>Phone</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id}>
              <td>{driver.name}</td>
              <td>{driver.license_number}</td>
              <td>{driver.phone}</td>
              <td>{driver.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DriverList
