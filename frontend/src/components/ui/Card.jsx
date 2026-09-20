/**
 * Card
 *
 * A neutral surface container. Composes three optional sub-components:
 *   <Card.Header>  — title area, adds a bottom divider
 *   <Card.Body>    — padded content area
 *   <Card.Footer>  — footer area, adds a top divider
 *
 * Usage:
 *   <Card>
 *     <Card.Header>Title</Card.Header>
 *     <Card.Body>Content</Card.Body>
 *   </Card>
 *
 * Or plain (no padding injected):
 *   <Card className="p-6">...</Card>
 */

function Card({ className = '', children, ...props }) {
  return (
    <div className={['surface', className].join(' ')} {...props}>
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ className = '', children, ...props }) {
  return (
    <div
      className={['px-6 py-4 divider border-t-0', className].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Body = function CardBody({ className = '', children, ...props }) {
  return (
    <div className={['px-6 py-4', className].join(' ')} {...props}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ className = '', children, ...props }) {
  return (
    <div
      className={['px-6 py-4 divider', className].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
