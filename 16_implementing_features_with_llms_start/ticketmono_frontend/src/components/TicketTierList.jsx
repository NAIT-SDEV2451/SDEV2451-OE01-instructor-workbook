import TicketTierSelector from './TicketTierSelector'

function TicketTierList({ tiers, eventId, eventName }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-3">Ticket Tiers</h2>
      <div className="flex flex-col gap-3">
        {tiers.map((tier) => (
          <TicketTierSelector key={tier.id} tier={tier} eventId={eventId} eventName={eventName} />
        ))}
      </div>
    </div>
  )
}

export default TicketTierList
