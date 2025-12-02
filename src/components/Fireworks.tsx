"use client";

import './Fireworks.css';

const Fireworks = () => {
  const fireworks = Array.from({ length: 8 }).map((_, index) => (
    <div key={index} className="firework"></div>
  ));

  return (
    <div className="fireworks-container">
      {fireworks}
    </div>
  );
};

export default Fireworks;