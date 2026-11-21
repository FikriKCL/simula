from typing import Literal
from pydantic import BaseModel

class RegistrationDecision(BaseModel):
    status: Literal["PENDING", "APPROVED", "REJECTED"]
