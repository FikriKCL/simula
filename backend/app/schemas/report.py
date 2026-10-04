from pydantic import BaseModel


class EvaluationOut(BaseModel):
    module_id: int
    participants: int
    paired_participants: int
    mean_pre: float | None
    mean_post: float | None
    mean_gain: float | None
