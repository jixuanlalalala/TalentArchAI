import os
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, call, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import worker  # noqa: E402
from services.analysis_worker_service import WorkerCycleResult  # noqa: E402


class WorkerTests(unittest.TestCase):
    def test_analysis_interval_defaults_to_ten_seconds(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(worker._analysis_interval_seconds(), 10.0)

    def test_analysis_interval_must_be_positive(self):
        with patch.dict(
            os.environ,
            {"OPENROUTER_ANALYSIS_INTERVAL_SECONDS": "0"},
        ):
            with self.assertRaisesRegex(RuntimeError, "greater than zero"):
                worker._analysis_interval_seconds()

    @patch("worker.create_service_client")
    @patch("worker.SupabaseAnalysisQueue")
    @patch("worker.process_next_analysis")
    @patch("worker.time.sleep")
    def test_worker_waits_between_processed_analysis_tasks(
        self,
        sleep,
        process_next,
        queue_class,
        create_client,
    ):
        queue_class.return_value = Mock()
        process_next.side_effect = [
            WorkerCycleResult(outcome="completed", task_id="match-1"),
            KeyboardInterrupt,
        ]

        with patch.dict(
            os.environ,
            {
                "ANALYSIS_WORKER_POLL_SECONDS": "5",
                "OPENROUTER_ANALYSIS_INTERVAL_SECONDS": "12",
            },
        ):
            with self.assertRaises(KeyboardInterrupt):
                worker.run_worker()

        self.assertEqual(sleep.call_args_list, [call(12.0)])
        create_client.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
